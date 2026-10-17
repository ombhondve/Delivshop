import { query, dbPool } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { parseProductPackaging } from '../utils/packaging.js';

export const orderRepository = {
  async findById(orderId: string): Promise<any | null> {
    const res = await query(
      `SELECT o.*, s.name as shop_name, s.phone as shop_phone, s.address as shop_address,
              d.status as delivery_status, d.driver_id, u.name as driver_name, u.phone as driver_phone,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'productId', oi.product_id,
                    'name', p.name,
                    'sku', p.sku,
                    'category', p.category,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unit_price,
                    'totalPrice', oi.total_price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) as items
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN deliveries d ON o.id = d.order_id
       LEFT JOIN users u ON d.driver_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1
       GROUP BY o.id, s.name, s.phone, s.address, d.status, d.driver_id, u.name, u.phone
       LIMIT 1`,
      [orderId]
    );
    return res.rows[0] || null;
  },

  async findByShopId(shopId: string): Promise<any[]> {
    // Resolve shopId whether it's an internal UUID or YYYYMMDDNNN
    const res = await query(
      `SELECT o.*, s.name as shop_name,
              d.status as delivery_status, u.name as driver_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'productId', oi.product_id,
                    'name', p.name,
                    'quantity', oi.quantity,
                    'unitPrice', oi.unit_price,
                    'totalPrice', oi.total_price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) as items
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN deliveries d ON o.id = d.order_id
       LEFT JOIN users u ON d.driver_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE (o.shop_id::text = $1 OR s.shop_id = $1)
       GROUP BY o.id, s.name, d.status, u.name
       ORDER BY o.created_at DESC`,
      [shopId]
    );
    return res.rows;
  },

  async createOrder(params: {
    shopId: string;
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    deliveryAddress: any;
    idempotencyKey?: string;
  }): Promise<any> {
    const { shopId, userId, items, deliveryAddress, idempotencyKey } = params;

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Idempotency Check: if key provided and already processed, return existing order
      if (idempotencyKey && idempotencyKey.trim()) {
        const cleanKey = idempotencyKey.trim();
        const existingRes = await client.query(
          `SELECT o.*, s.name as shop_name,
                  COALESCE(
                    json_agg(
                      json_build_object(
                        'id', oi.id,
                        'productId', oi.product_id,
                        'name', p.name,
                        'quantity', oi.quantity,
                        'unitPrice', oi.unit_price,
                        'totalPrice', oi.total_price
                      )
                    ) FILTER (WHERE oi.id IS NOT NULL),
                    '[]'
                  ) as items
           FROM orders o
           JOIN shops s ON o.shop_id = s.id
           LEFT JOIN order_items oi ON o.id = oi.order_id
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE o.idempotency_key = $1
           GROUP BY o.id, s.name
           LIMIT 1`,
          [cleanKey]
        );

        if (existingRes.rowCount && existingRes.rowCount > 0) {
          await client.query('COMMIT');
          return {
            ...existingRes.rows[0],
            isDuplicateReplay: true,
          };
        }
      }

      // 2. Resolve shop record (UUID or shop_id)
      const shopRes = await client.query(
        `SELECT id, name, status, credit_limit, outstanding_balance FROM shops WHERE (id::text = $1 OR shop_id = $1) LIMIT 1`,
        [shopId]
      );
      if (shopRes.rowCount === 0) {
        throw new AppError('Associated shop not found', 404);
      }
      const shop = shopRes.rows[0];

      if (shop.status === 'INACTIVE') {
        throw new AppError('Cannot place orders for a deactivated shop', 403);
      }

      // 3. Validate product existence and prices from active dairy catalog
      const productIds = items.map((i) => i.productId);
      const prodRes = await client.query(
        `SELECT id, name, sku, category, pack_size, base_unit, units_per_pack, price, stock_quantity, is_active 
         FROM products 
         WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
        [productIds]
      );
      const productMap = new Map(prodRes.rows.map((p) => [p.id, p]));

      let subtotal = 0;
      let totalVolumeLitres = 0;
      let totalCratesCount = 0;
      let totalPackagesCount = 0;

      const validatedItems = items.map((item) => {
        const prod = productMap.get(item.productId);
        if (!prod || !prod.is_active) {
          throw new AppError(`Product "${prod?.name || item.productId}" is no longer available in the active dairy catalog`, 400);
        }
        const unitPrice = Number(prod.price);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;
        totalPackagesCount += item.quantity;

        const pkg = parseProductPackaging({
          pack_size: prod.pack_size,
          base_unit: prod.base_unit,
          category: prod.category,
          units_per_pack: prod.units_per_pack,
        });

        let lineLitres = 0;
        let lineWeightKg = 0;
        if (pkg.isLiquid) {
          lineLitres = item.quantity * pkg.litresPerPackage;
          totalVolumeLitres += lineLitres;
        } else {
          lineWeightKg = item.quantity * pkg.weightKgPerPackage;
        }

        let crates = 0;
        if (pkg.isCrateCapacityKnown && pkg.unitsPerCrate) {
          crates = Number((item.quantity / pkg.unitsPerCrate).toFixed(2));
          totalCratesCount += crates;
        }

        return {
          productId: item.productId,
          name: prod.name,
          sku: prod.sku,
          packSize: prod.pack_size,
          baseUnit: prod.base_unit,
          category: prod.category,
          quantity: item.quantity,
          cratesCount: crates,
          volumeLitres: lineLitres,
          weightKg: lineWeightKg,
          unitPrice,
          totalPrice: lineTotal,
          isLiquid: pkg.isLiquid,
          isCrateCapacityKnown: pkg.isCrateCapacityKnown,
        };
      });

      const deliveryFee = 0.0;
      const total = subtotal + deliveryFee;

      // Generate human-readable order number: ORD-YYYYMMDD-XXXX
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

      // 4. Insert order with calculated volumes and crate counts
      const orderRes = await client.query(
        `INSERT INTO orders (
          order_number, shop_id, customer_id, status, subtotal, delivery_fee, total,
          total_volume_litres, total_crates_count, total_packages_count,
          delivery_address, idempotency_key
        ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          orderNumber,
          shop.id,
          userId,
          subtotal,
          deliveryFee,
          total,
          Number(totalVolumeLitres.toFixed(3)),
          Number(totalCratesCount.toFixed(2)),
          totalPackagesCount,
          JSON.stringify(deliveryAddress),
          idempotencyKey?.trim() || null,
        ]
      );
      const order = orderRes.rows[0];

      // 5. Insert order line items with explicit packaging & volume metrics
      for (const line of validatedItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, 0, $5, 'PACKAGE', $6, $7)`,
          [order.id, line.productId, line.quantity, line.cratesCount, line.volumeLitres, line.unitPrice, line.totalPrice]
        );
      }

      // 6. Create initial delivery dispatch record
      await client.query(
        `INSERT INTO deliveries (order_id, status, notes)
         VALUES ($1, 'PENDING_ASSIGNMENT', 'Shop replenishment order submitted; awaiting admin approval and dispatch assignment')
         ON CONFLICT (order_id) DO NOTHING`,
        [order.id]
      );

      await client.query('COMMIT');

      return {
        ...order,
        shop_name: shop.name,
        items: validatedItems,
        isDuplicateReplay: false,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateStatus(orderId: string, status: string): Promise<any> {
    const res = await query(
      `UPDATE orders 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, orderId]
    );
    return res.rows[0];
  },

  async listOrders(filters: {
    status?: string;
    search?: string;
    shopId?: string;
    driverId?: string;
    routeId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: any[]; total: number }> {
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters.status && filters.status.trim() && filters.status.toUpperCase() !== 'ALL') {
      const rawStatus = filters.status.trim().toUpperCase();
      if (rawStatus === 'PENDING_CONFIRMATION' || rawStatus === 'PENDING') {
        conditions.push(`o.status::text = 'PENDING'`);
      } else if (rawStatus === 'DISPATCH_PREPARED' || rawStatus === 'PREPARING') {
        conditions.push(`o.status::text = 'PREPARING'`);
      } else if (rawStatus === 'DISPUTED') {
        conditions.push(`(o.status::text = 'DISPUTED' OR (o.status::text = 'CONFIRMED' AND d.status::text = 'FAILED'))`);
      } else {
        params.push(rawStatus);
        conditions.push(`o.status::text = $${params.length}`);
      }
    }

    if (filters.shopId && filters.shopId.trim()) {
      params.push(filters.shopId.trim());
      conditions.push(`(o.shop_id::text = $${params.length} OR s.shop_id = $${params.length})`);
    }

    if (filters.driverId && filters.driverId.trim()) {
      params.push(filters.driverId.trim());
      conditions.push(`d.driver_id::text = $${params.length}`);
    }

    if (filters.search && filters.search.trim()) {
      params.push(`%${filters.search.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        o.order_number ILIKE $${pIdx} OR 
        s.name ILIKE $${pIdx} OR 
        s.shop_id ILIKE $${pIdx} OR 
        u.name ILIKE $${pIdx} OR 
        r.name ILIKE $${pIdx} OR
        r.route_code ILIKE $${pIdx}
      )`);
    }

    if (filters.date && filters.date.trim()) {
      params.push(filters.date.trim());
      conditions.push(`o.created_at::date = $${params.length}::date`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(DISTINCT o.id) as total
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN deliveries d ON o.id = d.order_id
       LEFT JOIN users u ON d.driver_id = u.id
       LEFT JOIN routes r ON o.route_id = r.id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0]?.total || '0', 10);

    const limit = filters.limit ? Math.min(Math.max(1, filters.limit), 100) : 50;
    const offset = filters.offset ? Math.max(0, filters.offset) : 0;

    const dataRes = await query(
      `SELECT o.*,
              s.name as shop_name, s.shop_id as shop_code, s.phone as shop_phone, s.address as shop_address,
              d.status as delivery_status, d.driver_id, u.name as driver_name, u.phone as driver_phone,
              COALESCE(r.name, o.delivery_address->>'route', 'City Hub Dispatch') as route_name,
              r.route_code,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'productId', oi.product_id,
                    'name', p.name,
                    'sku', p.sku,
                    'category', p.category,
                    'packSize', p.pack_size,
                    'baseUnit', p.base_unit,
                    'unitsPerPack', p.units_per_pack,
                    'quantity', oi.quantity,
                    'cratesCount', oi.crates_count,
                    'deliveredQuantity', oi.delivered_quantity,
                    'volumeLitres', oi.volume_litres,
                    'unitPrice', oi.unit_price,
                    'totalPrice', oi.total_price,
                    'unitType', oi.unit_type
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) as items
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN deliveries d ON o.id = d.order_id
       LEFT JOIN users u ON d.driver_id = u.id
       LEFT JOIN routes r ON o.route_id = r.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       ${whereClause}
       GROUP BY o.id, s.name, s.shop_id, s.phone, s.address, d.status, d.driver_id, u.name, u.phone, r.name, r.route_code
       ORDER BY o.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const orders = dataRes.rows.map((row) => {
      let liquidLitres = 0;
      let calculatedPackages = 0;
      let calculatedCrates = 0;
      let hasUnknownCrates = false;

      const items = (row.items || []).map((item: any) => {
        const pkg = parseProductPackaging({
          pack_size: item.packSize,
          base_unit: item.baseUnit,
          category: item.category,
          units_per_pack: item.unitsPerPack,
        });

        const qty = Number(item.quantity) || 0;
        calculatedPackages += qty;

        let itemLitres = 0;
        let itemWeightKg = 0;

        if (pkg.isLiquid) {
          if (item.volumeLitres != null && Number(item.volumeLitres) > 0) {
            itemLitres = Number(item.volumeLitres);
          } else {
            itemLitres = qty * pkg.litresPerPackage;
          }
          liquidLitres += itemLitres;
        } else {
          itemWeightKg = qty * pkg.weightKgPerPackage;
        }

        let crates = item.cratesCount != null && Number(item.cratesCount) > 0 ? Number(item.cratesCount) : null;
        if (crates == null && pkg.isCrateCapacityKnown && pkg.unitsPerCrate) {
          crates = Number((qty / pkg.unitsPerCrate).toFixed(2));
        }

        if (crates != null) {
          calculatedCrates += crates;
        } else {
          hasUnknownCrates = true;
        }

        return {
          ...item,
          isLiquid: pkg.isLiquid,
          packagingType: pkg.packagingType,
          packageSize: pkg.packageSize,
          litresPerPackage: pkg.litresPerPackage,
          weightKgPerPackage: pkg.weightKgPerPackage,
          unitsPerCrate: pkg.unitsPerCrate,
          isCrateCapacityKnown: pkg.isCrateCapacityKnown,
          calculatedVolumeLitres: itemLitres,
          calculatedWeightKg: itemWeightKg,
          calculatedCrates: crates,
        };
      });

      const totalVol = row.total_volume_litres != null && Number(row.total_volume_litres) > 0
        ? Number(row.total_volume_litres)
        : liquidLitres;

      const totalCrates = row.total_crates_count != null && Number(row.total_crates_count) > 0
        ? Number(row.total_crates_count)
        : calculatedCrates;

      const totalPkgs = row.total_packages_count != null && Number(row.total_packages_count) > 0
        ? Number(row.total_packages_count)
        : calculatedPackages;

      return {
        ...row,
        total_volume_litres: totalVol,
        total_crates_count: totalCrates,
        total_packages_count: totalPkgs,
        has_unknown_crates: hasUnknownCrates,
        items,
      };
    });

    return { orders, total };
  },

  async getVolumeSummary(filters: {
    status?: string;
    deliveryDate?: string;
    date?: string;
    shopId?: string;
    productId?: string;
    packagingSize?: string;
  }): Promise<any> {
    const params: any[] = [];
    const conditions: string[] = [];

    // Filter out CANCELLED / REJECTED by default unless explicitly asked
    if (filters.status && filters.status.trim() && filters.status.toUpperCase() !== 'ALL') {
      const statuses = filters.status.split(',').map((s) => {
        const clean = s.trim().toUpperCase();
        if (clean === 'PENDING_CONFIRMATION') return 'PENDING';
        if (clean === 'DISPATCH_PREPARED') return 'PREPARING';
        return clean;
      });
      params.push(statuses);
      conditions.push(`o.status::text = ANY($${params.length}::text[])`);
    } else {
      conditions.push(`o.status::text NOT IN ('CANCELLED', 'REJECTED')`);
    }

    const targetDate = filters.deliveryDate || filters.date;
    if (targetDate && targetDate.trim()) {
      params.push(targetDate.trim());
      conditions.push(`(o.created_at::date = $${params.length}::date OR o.delivered_at::date = $${params.length}::date)`);
    }

    if (filters.shopId && filters.shopId.trim()) {
      params.push(filters.shopId.trim());
      conditions.push(`(s.id::text = $${params.length} OR s.shop_id = $${params.length})`);
    }

    if (filters.productId && filters.productId.trim()) {
      params.push(filters.productId.trim());
      conditions.push(`(p.id::text = $${params.length} OR p.sku = $${params.length})`);
    }

    if (filters.packagingSize && filters.packagingSize.trim()) {
      params.push(`%${filters.packagingSize.trim()}%`);
      conditions.push(`p.pack_size ILIKE $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT o.id as order_id, o.order_number, o.status::text as order_status, o.subtotal, o.total,
             o.total_volume_litres as order_total_volume_litres,
             o.total_crates_count as order_total_crates_count,
             o.total_packages_count as order_total_packages_count,
             o.created_at, o.delivered_at, o.notes,
             s.id as shop_id, s.shop_id as shop_code, s.name as shop_name, s.phone as shop_phone, s.address as shop_address,
             COALESCE(d.status::text, o.status::text) as dispatch_status, u.name as driver_name,
             COALESCE(r.name, o.delivery_address->>'route', 'City Hub Dispatch') as route_name,
             oi.id as item_id, oi.product_id, oi.quantity, oi.crates_count, oi.volume_litres, oi.unit_price, oi.total_price, oi.unit_type,
             p.name as product_name, p.sku, p.category, p.pack_size, p.base_unit, p.units_per_pack
      FROM orders o
      JOIN shops s ON o.shop_id = s.id
      LEFT JOIN deliveries d ON o.id = d.order_id
      LEFT JOIN users u ON d.driver_id = u.id
      LEFT JOIN routes r ON o.route_id = r.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      ${whereClause}
      ORDER BY o.created_at DESC, oi.id ASC
    `;

    const res = await query(sql, params);
    const rows = res.rows;

    const ordersMap = new Map<string, any>();
    const productsMap = new Map<string, any>();
    const includedStatusesSet = new Set<string>();
    const includedShopsSet = new Set<string>();

    let totalLiquidVolumeLitres = 0;
    let totalPackagesRequired = 0;
    let totalCratesRequired = 0;
    let hasIncompletePackaging = false;

    for (const row of rows) {
      if (!row.order_id) continue;

      includedStatusesSet.add(row.order_status);
      includedShopsSet.add(row.shop_id);

      // 1. Order aggregation
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          orderId: row.order_id,
          orderNumber: row.order_number,
          shopId: row.shop_id,
          shopCode: row.shop_code || 'SH-NA',
          shopName: row.shop_name,
          shopPhone: row.shop_phone,
          shopAddress: row.shop_address,
          orderStatus: row.order_status,
          dispatchStatus: row.dispatch_status,
          driverName: row.driver_name || 'Unassigned',
          routeName: row.route_name,
          totalLiquidVolumeLitres: 0,
          totalPackages: 0,
          totalCrates: 0,
          isCrateCapacityKnown: true,
          createdAt: row.created_at,
          deliveredAt: row.delivered_at,
          items: [],
        });
      }

      const orderEntry = ordersMap.get(row.order_id);

      // If line item exists
      if (row.item_id && row.product_id) {
        const pkg = parseProductPackaging({
          pack_size: row.pack_size,
          base_unit: row.base_unit,
          category: row.category,
          units_per_pack: row.units_per_pack,
        });

        const qty = Number(row.quantity) || 0;
        let lineLitres = 0;
        let lineWeightKg = 0;

        if (pkg.isLiquid) {
          if (row.volume_litres != null && Number(row.volume_litres) > 0) {
            lineLitres = Number(row.volume_litres);
          } else {
            lineLitres = qty * pkg.litresPerPackage;
          }
          orderEntry.totalLiquidVolumeLitres += lineLitres;
          totalLiquidVolumeLitres += lineLitres;
        } else {
          lineWeightKg = qty * pkg.weightKgPerPackage;
        }

        orderEntry.totalPackages += qty;
        totalPackagesRequired += qty;

        let crates = row.crates_count != null && Number(row.crates_count) > 0 ? Number(row.crates_count) : null;
        if (crates == null && pkg.isCrateCapacityKnown && pkg.unitsPerCrate) {
          crates = Number((qty / pkg.unitsPerCrate).toFixed(2));
        }

        if (crates != null) {
          orderEntry.totalCrates += crates;
          totalCratesRequired += crates;
        } else {
          orderEntry.isCrateCapacityKnown = false;
          hasIncompletePackaging = true;
        }

        orderEntry.items.push({
          itemId: row.item_id,
          productId: row.product_id,
          productName: row.product_name,
          sku: row.sku,
          category: row.category,
          packageSize: pkg.packageSize,
          packagingType: pkg.packagingType,
          isLiquid: pkg.isLiquid,
          quantity: qty,
          cratesCount: crates,
          isCrateCapacityKnown: pkg.isCrateCapacityKnown,
          volumeLitres: pkg.isLiquid ? lineLitres : null,
          weightKg: !pkg.isLiquid ? lineWeightKg : null,
          unitPrice: Number(row.unit_price) || 0,
          totalPrice: Number(row.total_price) || 0,
        });

        // 2. Product breakdown aggregation
        const prodKey = `${row.product_id}_${pkg.packageSize}`;
        if (!productsMap.has(prodKey)) {
          productsMap.set(prodKey, {
            productId: row.product_id,
            productName: row.product_name,
            sku: row.sku,
            packagingType: pkg.packagingType,
            packageSize: pkg.packageSize,
            category: row.category,
            isLiquid: pkg.isLiquid,
            totalPackages: 0,
            totalVolumeLitres: pkg.isLiquid ? 0 : null,
            totalWeightKg: !pkg.isLiquid ? 0 : null,
            totalCrates: pkg.isCrateCapacityKnown ? 0 : null,
            crateCapacity: pkg.unitsPerCrate,
            isCrateCapacityKnown: pkg.isCrateCapacityKnown,
            missingConfigReason: pkg.missingConfigReason,
          });
        }

        const prodEntry = productsMap.get(prodKey);
        prodEntry.totalPackages += qty;
        if (pkg.isLiquid && prodEntry.totalVolumeLitres !== null) {
          prodEntry.totalVolumeLitres += lineLitres;
        } else if (!pkg.isLiquid && prodEntry.totalWeightKg !== null) {
          prodEntry.totalWeightKg += lineWeightKg;
        }

        if (prodEntry.isCrateCapacityKnown && prodEntry.totalCrates !== null) {
          if (crates != null) {
            prodEntry.totalCrates += crates;
          } else if (pkg.unitsPerCrate) {
            prodEntry.totalCrates += Number((qty / pkg.unitsPerCrate).toFixed(2));
          }
        }
      }
    }

    // Convert products map to sorted array
    const packagingBreakdown = Array.from(productsMap.values()).map((p) => ({
      ...p,
      totalVolumeLitres: p.totalVolumeLitres !== null ? Number(p.totalVolumeLitres.toFixed(3)) : null,
      totalWeightKg: p.totalWeightKg !== null ? Number(p.totalWeightKg.toFixed(2)) : null,
      totalCrates: p.totalCrates !== null ? Number(p.totalCrates.toFixed(2)) : null,
    }));

    // Convert orders map to sorted array
    const shopWiseSummary = Array.from(ordersMap.values()).map((o) => ({
      ...o,
      totalLiquidVolumeLitres: Number(o.totalLiquidVolumeLitres.toFixed(3)),
      totalCrates: o.isCrateCapacityKnown ? Number(o.totalCrates.toFixed(2)) : null,
    }));

    return {
      overview: {
        totalEligibleOrders: ordersMap.size,
        totalLiquidVolumeLitres: Number(totalLiquidVolumeLitres.toFixed(3)),
        totalPackagesRequired,
        totalCratesRequired: hasIncompletePackaging && totalCratesRequired === 0 ? null : Number(totalCratesRequired.toFixed(2)),
        distinctProductsCount: productsMap.size,
        includedShopsCount: includedShopsSet.size,
        includedStatuses: Array.from(includedStatusesSet).sort(),
        hasIncompletePackaging,
      },
      packagingBreakdown,
      shopWiseSummary,
      metadata: {
        generatedAt: new Date().toISOString(),
        appliedFilters: filters,
      },
    };
  },
};
