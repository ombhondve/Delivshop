import { dbPool, query } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { calculateHaversineDistanceMeters } from './map-resolver.service.js';
import { auditService } from './audit.service.js';

export interface PickupShopContribution {
  shopId: string;
  shopCode: string;
  shopName: string;
  orderId: string;
  orderNumber: string;
  quantity: number;
}

export interface PickupProductItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  packSize: string;
  requiredQuantity: number;
  collectedQuantity: number;
  outstandingQuantity: number;
  unitPrice?: number;
  totalPrice?: number;
  status: 'PENDING' | 'COLLECTED' | 'SHORTAGE' | 'PARTIAL';
  shortageReason?: string | null;
  shopBreakdown: PickupShopContribution[];
}

export interface CompanyPickupStop {
  companyId: string;
  companyCode: string;
  companyName: string;
  companyType: string;
  contactPerson: string;
  phone: string;
  email: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  stopSequence: number;
  status: 'PENDING' | 'ARRIVED' | 'COLLECTED' | 'SHORTAGE' | 'SKIPPED';
  arrivalTime?: string | null;
  completedTime?: string | null;
  verifiedDistanceMeters?: number | null;
  discrepancyReason?: string | null;
  totalRequiredUnits: number;
  totalCollectedUnits: number;
  products: PickupProductItem[];
}

export interface PickupRequirementsResponse {
  runId?: string;
  runCode?: string;
  routeId?: string;
  routeName?: string;
  deliveryDate?: string;
  driverId?: string;
  driverName?: string;
  vehicleRegistration?: string;
  totalPickups?: number;
  completedPickups?: number;
  totalProductsCount?: number;
  totalRequiredUnits?: number;
  totalCollectedUnits?: number;
  supplierPickups?: CompanyPickupStop[];
  aggregatedProducts?: any[];
  summary: {
    totalCompanies: number;
    totalProducts: number;
    totalRequiredUnits: number;
    totalCollectedUnits: number;
    progressPercent: number;
    totalShopsCount: number;
  };
  companies: CompanyPickupStop[];
}

export const pickupService = {
  /**
   * Calculate authoritative pickup requirements grouped by supplier company and product.
   * Strips pricing when userRole is DRIVER.
   */
  async getPickupRequirements(params: {
    runId?: string;
    routeId?: string;
    date?: string;
    userRole?: string;
  }): Promise<PickupRequirementsResponse> {
    const isDriver = params.userRole === 'DRIVER';
    let run: any = null;
    let routeId = params.routeId;
    let deliveryDate = params.date;

    if (params.runId) {
      const runRes = await query(
        `SELECT dr.*, r.name as route_name, r.route_code,
                u.name as driver_name, u.employee_id as driver_employee_id,
                v.registration_number as vehicle_registration
         FROM delivery_runs dr
         JOIN routes r ON r.id = dr.route_id
         LEFT JOIN users u ON u.id = dr.driver_id
         LEFT JOIN vehicles v ON v.id = dr.vehicle_id
         WHERE dr.id = $1`,
        [params.runId]
      );
      if (runRes.rows.length === 0) {
        throw new AppError('Delivery run assignment not found', 404);
      }
      run = runRes.rows[0];
      routeId = run.route_id;
      deliveryDate = run.delivery_date instanceof Date
        ? run.delivery_date.toISOString().split('T')[0]
        : String(run.delivery_date).split('T')[0];
    } else if (routeId) {
      const rRes = await query('SELECT * FROM routes WHERE id = $1', [routeId]);
      if (rRes.rows.length === 0) {
        throw new AppError('Route template not found', 404);
      }
      run = {
        route_id: routeId,
        route_name: rRes.rows[0].name,
        route_code: rRes.rows[0].route_code,
      };
    } else {
      throw new AppError('Either runId or routeId is required to calculate pickup requirements', 400);
    }

    // 1. Identify shop IDs served by this run/route
    let shopIds: string[] = [];
    if (run?.id) {
      const stopsRes = await query(
        'SELECT shop_id FROM delivery_run_stops WHERE run_id = $1 ORDER BY stop_sequence ASC',
        [run.id]
      );
      shopIds = stopsRes.rows.map((r: any) => r.shop_id);
    }
    if (shopIds.length === 0 && routeId) {
      const routeStopsRes = await query(
        'SELECT shop_id FROM route_stops WHERE route_id = $1 ORDER BY stop_sequence ASC',
        [routeId]
      );
      shopIds = routeStopsRes.rows.map((r: any) => r.shop_id);
    }

    if (shopIds.length === 0) {
      return {
        runId: run?.id,
        runCode: run?.run_code,
        routeId: routeId,
        routeName: run?.route_name,
        deliveryDate: deliveryDate,
        driverId: run?.driver_id,
        driverName: run?.driver_name,
        vehicleRegistration: run?.vehicle_registration,
        totalPickups: 0,
        completedPickups: 0,
        totalProductsCount: 0,
        totalRequiredUnits: 0,
        totalCollectedUnits: 0,
        supplierPickups: [],
        aggregatedProducts: [],
        summary: {
          totalCompanies: 0,
          totalProducts: 0,
          totalRequiredUnits: 0,
          totalCollectedUnits: 0,
          progressPercent: 0,
          totalShopsCount: 0,
        },
        companies: [],
      };
    }

    // 2. Query eligible shop orders for this run / route
    const ordersQuery = run?.id
      ? `SELECT id FROM orders
         WHERE (delivery_run_id = $1 OR (route_id = $2 AND shop_id = ANY($3) AND (confirmed_delivery_date = $4 OR requested_delivery_date = $4 OR delivery_run_id IS NULL)))
           AND status NOT IN ('CANCELLED', 'DELIVERED')`
      : `SELECT id FROM orders
         WHERE (route_id = $1 OR shop_id = ANY($2))
           AND status NOT IN ('CANCELLED', 'DELIVERED')`;

    const ordersParams = run?.id
      ? [run.id, routeId, shopIds, deliveryDate]
      : [routeId, shopIds];

    const ordersRes = await query(ordersQuery, ordersParams);
    const orderIds = ordersRes.rows.map((r: any) => r.id);

    // If no active orders, also check if any existing orders exist for these shops to preview requirements
    if (orderIds.length === 0 && shopIds.length > 0) {
      const fallbackOrdersRes = await query(
        `SELECT id FROM orders WHERE shop_id = ANY($1) AND status != 'CANCELLED' ORDER BY created_at DESC LIMIT 10`,
        [shopIds]
      );
      orderIds.push(...fallbackOrdersRes.rows.map((r: any) => r.id));
    }

    if (orderIds.length === 0) {
      return {
        runId: run?.id,
        runCode: run?.run_code,
        routeId: routeId,
        routeName: run?.route_name,
        deliveryDate: deliveryDate,
        driverId: run?.driver_id,
        driverName: run?.driver_name,
        vehicleRegistration: run?.vehicle_registration,
        totalPickups: 0,
        completedPickups: 0,
        totalProductsCount: 0,
        totalRequiredUnits: 0,
        totalCollectedUnits: 0,
        supplierPickups: [],
        aggregatedProducts: [],
        summary: {
          totalCompanies: 0,
          totalProducts: 0,
          totalRequiredUnits: 0,
          totalCollectedUnits: 0,
          progressPercent: 0,
          totalShopsCount: shopIds.length,
        },
        companies: [],
      };
    }

    // 3. Query order items joined with products and companies
    const itemsRes = await query(
      `SELECT 
         c.id as company_id,
         c.company_code,
         c.name as company_name,
         c.company_type,
         c.contact_person,
         c.phone,
         c.email,
         c.address_line_1,
         c.city,
         c.postal_code,
         c.latitude as company_lat,
         c.longitude as company_lng,
         p.id as product_id,
         p.name as product_name,
         p.sku,
         COALESCE(p.base_unit, 'Unit') as base_unit,
         COALESCE(p.pack_size, '1 unit') as pack_size,
         p.price as product_price,
         oi.quantity as ordered_quantity,
         oi.unit_price as item_unit_price,
         oi.total_price as item_total_price,
         o.id as order_id,
         o.order_number,
         s.id as shop_id,
         s.name as shop_name,
         s.shop_id as shop_code
       FROM orders o
       JOIN shops s ON s.id = o.shop_id
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
       JOIN companies c ON c.id = p.company_id
       WHERE o.id = ANY($1) AND c.deleted_at IS NULL
       ORDER BY c.name ASC, p.name ASC`,
      [orderIds]
    );

    // 4. Load persisted pickup fulfillment records if run exists
    const pickupRecordsMap = new Map<string, any>();
    const pickupItemsMap = new Map<string, any>();

    if (run?.id) {
      const pickupsRes = await query(
        `SELECT * FROM delivery_run_pickups WHERE run_id = $1`,
        [run.id]
      );
      for (const p of pickupsRes.rows) {
        pickupRecordsMap.set(p.company_id, p);
      }

      const pickupItemsRes = await query(
        `SELECT pi.*, p.company_id
         FROM delivery_run_pickup_items pi
         JOIN delivery_run_pickups p ON p.id = pi.pickup_id
         WHERE p.run_id = $1`,
        [run.id]
      );
      for (const pi of pickupItemsRes.rows) {
        pickupItemsMap.set(`${pi.company_id}_${pi.product_id}`, pi);
      }
    }

    // 5. Aggregate by company and product
    const companyMap = new Map<string, {
      company: any;
      productsMap: Map<string, PickupProductItem>;
    }>();

    for (const row of itemsRes.rows) {
      const cId = row.company_id;
      if (!companyMap.has(cId)) {
        companyMap.set(cId, {
          company: row,
          productsMap: new Map<string, PickupProductItem>(),
        });
      }

      const companyEntry = companyMap.get(cId)!;
      const pId = row.product_id;

      if (!companyEntry.productsMap.has(pId)) {
        const persistedItem = pickupItemsMap.get(`${cId}_${pId}`);
        const collectedQty = persistedItem ? Number(persistedItem.collected_quantity) : 0;

        const prodItem: PickupProductItem = {
          productId: pId,
          productName: row.product_name,
          sku: row.sku,
          unit: row.base_unit || 'Unit',
          packSize: row.pack_size || '1 unit',
          requiredQuantity: 0,
          collectedQuantity: collectedQty,
          outstandingQuantity: 0,
          status: 'PENDING',
          shortageReason: persistedItem?.shortage_reason || null,
          shopBreakdown: [],
        };

        if (!isDriver) {
          prodItem.unitPrice = Number(row.product_price || row.item_unit_price || 0);
        }

        companyEntry.productsMap.set(pId, prodItem);
      }

      const productItem = companyEntry.productsMap.get(pId)!;
      const qty = Number(row.ordered_quantity || 0);
      productItem.requiredQuantity += qty;

      if (!isDriver) {
        productItem.totalPrice = (productItem.totalPrice || 0) + Number(row.item_total_price || (qty * (productItem.unitPrice || 0)));
      }

      productItem.shopBreakdown.push({
        shopId: row.shop_id,
        shopCode: row.shop_code,
        shopName: row.shop_name,
        orderId: row.order_id,
        orderNumber: row.order_number,
        quantity: qty,
      });
    }

    // 6. Build structured company stops
    const companies: CompanyPickupStop[] = [];
    let grandTotalRequired = 0;
    let grandTotalCollected = 0;
    let seq = 1;

    for (const [cId, entry] of companyMap.entries()) {
      const c = entry.company;
      const persistedPickup = pickupRecordsMap.get(cId);

      const productsList: PickupProductItem[] = [];
      let compRequired = 0;
      let compCollected = 0;

      for (const prod of entry.productsMap.values()) {
        prod.outstandingQuantity = Math.max(0, prod.requiredQuantity - prod.collectedQuantity);
        if (prod.collectedQuantity >= prod.requiredQuantity && prod.requiredQuantity > 0) {
          prod.status = 'COLLECTED';
        } else if (prod.collectedQuantity > 0) {
          prod.status = 'PARTIAL';
        } else if (persistedPickup?.status === 'SHORTAGE') {
          prod.status = 'SHORTAGE';
        } else {
          prod.status = 'PENDING';
        }

        compRequired += prod.requiredQuantity;
        compCollected += prod.collectedQuantity;
        productsList.push(prod);
      }

      grandTotalRequired += compRequired;
      grandTotalCollected += compCollected;

      let compStatus: any = persistedPickup?.status || 'PENDING';
      if (compStatus === 'PENDING' && compCollected >= compRequired && compRequired > 0) {
        compStatus = 'COLLECTED';
      }

      const hasCoords = c.company_lat != null && c.company_lng != null;

      companies.push({
        companyId: cId,
        companyCode: c.company_code,
        companyName: c.company_name,
        companyType: c.company_type,
        contactPerson: c.contact_person,
        phone: c.phone,
        email: c.email,
        addressLine1: c.address_line_1,
        city: c.city,
        postalCode: c.postal_code,
        latitude: c.company_lat != null ? Number(c.company_lat) : null,
        longitude: c.company_lng != null ? Number(c.company_lng) : null,
        hasCoordinates: hasCoords,
        stopSequence: persistedPickup?.stop_sequence || seq++,
        status: compStatus,
        arrivalTime: persistedPickup?.arrival_time?.toISOString() || null,
        completedTime: persistedPickup?.completed_time?.toISOString() || null,
        verifiedDistanceMeters: persistedPickup?.verified_distance_meters != null
          ? Number(persistedPickup.verified_distance_meters)
          : null,
        discrepancyReason: persistedPickup?.discrepancy_reason || null,
        totalRequiredUnits: compRequired,
        totalCollectedUnits: compCollected,
        products: productsList,
      });
    }

    const totalProductsCount = companies.reduce((acc, comp) => acc + comp.products.length, 0);
    const progressPercent = grandTotalRequired > 0
      ? Math.min(100, Math.round((grandTotalCollected / grandTotalRequired) * 100))
      : 0;

    // 7. Route-wide aggregated products across all suppliers
    const aggMap = new Map<string, any>();
    for (const comp of companies) {
      for (const prod of comp.products) {
        if (!aggMap.has(prod.productId)) {
          aggMap.set(prod.productId, {
            productId: prod.productId,
            productName: prod.productName,
            productSku: prod.sku,
            unit: prod.unit,
            totalRequiredQuantity: 0,
            totalCollectedQuantity: 0,
            totalOutstandingQuantity: 0,
            suppliersCount: 0,
          });
        }
        const item = aggMap.get(prod.productId);
        item.totalRequiredQuantity += prod.requiredQuantity;
        item.totalCollectedQuantity += prod.collectedQuantity;
        item.totalOutstandingQuantity += prod.outstandingQuantity;
        item.suppliersCount += 1;
      }
    }
    const aggregatedProducts = Array.from(aggMap.values());
    const completedPickups = companies.filter(c => c.status === 'COLLECTED').length;

    return {
      runId: run?.id,
      runCode: run?.run_code,
      routeId: routeId,
      routeName: run?.route_name,
      deliveryDate: deliveryDate,
      driverId: run?.driver_id,
      driverName: run?.driver_name,
      vehicleRegistration: run?.vehicle_registration,
      totalPickups: companies.length,
      completedPickups,
      totalProductsCount,
      totalRequiredUnits: grandTotalRequired,
      totalCollectedUnits: grandTotalCollected,
      supplierPickups: companies,
      aggregatedProducts,
      summary: {
        totalCompanies: companies.length,
        totalProducts: totalProductsCount,
        totalRequiredUnits: grandTotalRequired,
        totalCollectedUnits: grandTotalCollected,
        progressPercent,
        totalShopsCount: shopIds.length,
      },
      companies,
    };
  },

  /**
   * Proximity Verification (300-metre radius)
   * Calculates Haversine distance between driver location and supplier company location.
   * If within 300m, records arrival and unlocks required pickup quantities.
   */
  async verifyProximity(
    runId: string,
    companyId: string,
    driverCoords: { latitude: number; longitude: number; accuracy?: number },
    driverUserId: string
  ): Promise<{
    verified: boolean;
    distanceMeters: number;
    companyName: string;
    arrivalTime?: string;
    message?: string;
    items?: PickupProductItem[];
  }> {
    const runRes = await query('SELECT * FROM delivery_runs WHERE id = $1', [runId]);
    if (runRes.rows.length === 0) {
      throw new AppError('Delivery run assignment not found', 404);
    }
    const run = runRes.rows[0];

    // Security: Driver can only verify proximity for their assigned run
    if (run.driver_id !== driverUserId) {
      const uRes = await query('SELECT role FROM users WHERE id = $1', [driverUserId]);
      const role = uRes.rows[0]?.role;
      if (role !== 'ADMIN' && role !== 'SUPPLIER') {
        throw new AppError('Access forbidden: You are not assigned to this delivery run', 403);
      }
    }

    const compRes = await query('SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL', [companyId]);
    if (compRes.rows.length === 0) {
      throw new AppError('Supplier company not found', 404);
    }
    const company = compRes.rows[0];

    if (company.latitude == null || company.longitude == null) {
      throw new AppError(
        `Supplier "${company.name}" does not have verified GPS coordinates configured. Please contact dispatch admin.`,
        400
      );
    }

    const compLat = Number(company.latitude);
    const compLng = Number(company.longitude);

    const distance = calculateHaversineDistanceMeters(
      driverCoords.latitude,
      driverCoords.longitude,
      compLat,
      compLng
    );

    const PROXIMITY_THRESHOLD_METERS = 300;

    if (distance > PROXIMITY_THRESHOLD_METERS) {
      return {
        verified: false,
        distanceMeters: distance,
        companyName: company.name,
        message: `You are currently ${Math.round(distance)} metres away from ${company.name}. Please move within 300 metres to unlock pickup quantities.`,
      };
    }

    // Proximity verified! Persist or update delivery_run_pickups
    const now = new Date();
    const upsertRes = await query(
      `INSERT INTO delivery_run_pickups (
         run_id, company_id, status, arrival_time,
         verified_latitude, verified_longitude, verified_distance_meters
       ) VALUES ($1, $2, 'ARRIVED', $3, $4, $5, $6)
       ON CONFLICT (run_id, company_id) DO UPDATE SET
         status = CASE WHEN delivery_run_pickups.status = 'PENDING' THEN 'ARRIVED' ELSE delivery_run_pickups.status END,
         arrival_time = COALESCE(delivery_run_pickups.arrival_time, EXCLUDED.arrival_time),
         verified_latitude = EXCLUDED.verified_latitude,
         verified_longitude = EXCLUDED.verified_longitude,
         verified_distance_meters = EXCLUDED.verified_distance_meters,
         updated_at = NOW()
       RETURNING *`,
      [runId, companyId, now, driverCoords.latitude, driverCoords.longitude, distance]
    );

    // Fetch unlocked pickup items for this company (without prices for driver)
    const reqs = await this.getPickupRequirements({
      runId,
      userRole: 'DRIVER',
    });
    const companyStop = reqs.companies.find((c) => c.companyId === companyId);

    await auditService.log({
      actorId: driverUserId,
      action: 'PICKUP_PROXIMITY_VERIFIED',
      entityType: 'delivery_run_pickups',
      entityId: upsertRes.rows[0].id,
      details: {
        runId,
        companyId,
        companyName: company.name,
        distanceMeters: distance,
        accuracy: driverCoords.accuracy,
      },
    });

    return {
      verified: true,
      distanceMeters: distance,
      companyName: company.name,
      arrivalTime: now.toISOString(),
      items: companyStop?.products || [],
    };
  },

  /**
   * Confirm pickup fulfillment at a supplier company.
   * Records collected quantities and discrepancy reasons idempotently.
   */
  async confirmPickup(
    runId: string,
    companyId: string,
    data: {
      items: Array<{ productId: string; collectedQuantity: number; shortageReason?: string | null }>;
      discrepancyReason?: string | null;
      notes?: string | null;
    },
    driverUserId: string
  ): Promise<any> {
    const runRes = await query('SELECT * FROM delivery_runs WHERE id = $1', [runId]);
    if (runRes.rows.length === 0) {
      throw new AppError('Delivery run assignment not found', 404);
    }
    const run = runRes.rows[0];

    if (run.driver_id !== driverUserId) {
      const uRes = await query('SELECT role FROM users WHERE id = $1', [driverUserId]);
      const role = uRes.rows[0]?.role;
      if (role !== 'ADMIN' && role !== 'SUPPLIER') {
        throw new AppError('Access forbidden: You are not assigned to this delivery run', 403);
      }
    }

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const hasShortage = Boolean(data.discrepancyReason) || data.items.some((it) => Boolean(it.shortageReason));
      const pickupStatus = hasShortage ? 'SHORTAGE' : 'COLLECTED';
      const now = new Date();

      // 1. Upsert delivery_run_pickups
      const pickupRes = await client.query(
        `INSERT INTO delivery_run_pickups (
           run_id, company_id, status, completed_time, discrepancy_reason, notes
         ) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (run_id, company_id) DO UPDATE SET
           status = $3,
           completed_time = $4,
           discrepancy_reason = $5,
           notes = $6,
           updated_at = NOW()
         RETURNING *`,
        [runId, companyId, pickupStatus, now, data.discrepancyReason || null, data.notes || null]
      );
      const pickupRecord = pickupRes.rows[0];

      // 2. Upsert items
      for (const it of data.items) {
        await client.query(
          `INSERT INTO delivery_run_pickup_items (
             pickup_id, product_id, collected_quantity, shortage_reason
           ) VALUES ($1, $2, $3, $4)
           ON CONFLICT (pickup_id, product_id) DO UPDATE SET
             collected_quantity = EXCLUDED.collected_quantity,
             shortage_reason = EXCLUDED.shortage_reason,
             updated_at = NOW()`,
          [pickupRecord.id, it.productId, it.collectedQuantity, it.shortageReason || null]
        );
      }

      // 3. Update run status if currently ASSIGNED or READY
      if (run.status === 'ASSIGNED' || run.status === 'READY') {
        await client.query(
          `UPDATE delivery_runs SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`,
          [runId]
        );
      }

      await client.query('COMMIT');

      await auditService.log({
        actorId: driverUserId,
        action: 'PICKUP_COLLECTION_CONFIRMED',
        entityType: 'delivery_run_pickups',
        entityId: pickupRecord.id,
        details: {
          runId,
          companyId,
          status: pickupStatus,
          itemCount: data.items.length,
          discrepancyReason: data.discrepancyReason,
        },
      });

      return pickupRecord;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
