import { dbPool, query } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import {
  PickupRecord,
  PickupRecordItem,
  SupplierBill,
  SupplierBillItem,
  SupplierPayment,
  SupplierFinancialSummary,
  PickupStatus,
  BillStatus,
  BillPaymentStatus,
  PaymentMethod,
} from '../types/supplier-billing.types.js';

export const supplierBillingRepository = {
  /**
   * Atomically get next sequential code for BILL, PAY, or PCK
   */
  async getNextSequence(counterType: 'BILL' | 'PAY' | 'PCK'): Promise<string> {
    const res = await query(
      `UPDATE supplier_billing_counters
       SET last_sequence = last_sequence + 1, updated_at = NOW()
       WHERE counter_type = $1
       RETURNING last_sequence`,
      [counterType]
    );

    let seq = 1001;
    if (res.rows.length > 0) {
      seq = Number(res.rows[0].last_sequence);
    } else {
      await query(
        `INSERT INTO supplier_billing_counters (counter_type, last_sequence)
         VALUES ($1, 1001)
         ON CONFLICT (counter_type) DO UPDATE SET last_sequence = supplier_billing_counters.last_sequence + 1`,
        [counterType]
      );
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${counterType}-${todayStr}-${seq}`;
  },

  /**
   * List pickup records with complete quantity tracking and associations
   */
  async listPickups(params: {
    companyId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    routeId?: string;
    isBilled?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: PickupRecord[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.companyId) {
      conditions.push(`(p.company_id::text = $${idx} OR c.company_code = $${idx})`);
      values.push(params.companyId);
      idx++;
    }

    if (params.status) {
      conditions.push(`p.status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    if (params.startDate) {
      conditions.push(`COALESCE(p.scheduled_date, p.created_at::date) >= $${idx}::date`);
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      conditions.push(`COALESCE(p.scheduled_date, p.created_at::date) <= $${idx}::date`);
      values.push(params.endDate);
      idx++;
    }

    if (params.routeId) {
      conditions.push(`(p.route_id = $${idx} OR dr.route_id = $${idx})`);
      values.push(params.routeId);
      idx++;
    }

    if (params.isBilled !== undefined) {
      conditions.push(`p.is_billed = $${idx}`);
      values.push(params.isBilled);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::text as count
       FROM delivery_run_pickups p
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN delivery_runs dr ON dr.id = p.run_id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataRes = await query(
      `SELECT 
         p.id,
         COALESCE(p.pickup_reference, 'PCK-' || SUBSTRING(p.id::text, 1, 8)) as pickup_reference,
         p.run_id,
         dr.run_code,
         COALESCE(p.route_id, dr.route_id) as route_id,
         r.name as route_name,
         p.company_id,
         c.name as company_name,
         c.company_code,
         COALESCE(p.driver_id, dr.driver_id) as driver_id,
         u.name as driver_name,
         u.phone as driver_phone,
         v.registration_number as vehicle_registration,
         p.stop_sequence,
         p.status,
         p.scheduled_date,
         p.scheduled_time_window,
         p.arrival_time,
         p.completed_time,
         p.verified_at,
         p.verified_by,
         vu.name as verified_by_name,
         p.verification_notes,
         p.discrepancy_reason,
         p.notes,
         p.is_billed,
         p.bill_id,
         sb.bill_number,
         p.created_at,
         p.updated_at
       FROM delivery_run_pickups p
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN delivery_runs dr ON dr.id = p.run_id
       LEFT JOIN routes r ON r.id = COALESCE(p.route_id, dr.route_id)
       LEFT JOIN users u ON u.id = COALESCE(p.driver_id, dr.driver_id)
       LEFT JOIN vehicles v ON v.id = dr.vehicle_id
       LEFT JOIN users vu ON vu.id = p.verified_by
       LEFT JOIN supplier_bills sb ON sb.id = p.bill_id
       ${whereClause}
       ORDER BY COALESCE(p.scheduled_date, p.created_at::date) DESC, p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    const pickupIds = dataRes.rows.map((r: any) => r.id);
    let itemsByPickupId = new Map<string, PickupRecordItem[]>();

    if (pickupIds.length > 0) {
      const itemsRes = await query(
        `SELECT 
           pi.id,
           pi.pickup_id,
           pi.product_id,
           prod.name as product_name,
           prod.sku as product_sku,
           prod.category,
           COALESCE(pi.unit, prod.base_unit, 'Unit') as unit,
           pi.required_quantity,
           pi.collected_quantity,
           pi.accepted_quantity,
           pi.rejected_quantity,
           pi.shortage_quantity,
           COALESCE(pi.supplier_purchase_price, prod.purchase_cost, 0.00) as supplier_purchase_price,
           COALESCE(pi.tax_rate, prod.tax_rate, 0.00) as tax_rate,
           pi.line_total,
           pi.shortage_reason,
           pi.verification_remarks,
           pi.is_billed,
           pi.bill_item_id
         FROM delivery_run_pickup_items pi
         JOIN products prod ON prod.id = pi.product_id
         WHERE pi.pickup_id = ANY($1)
         ORDER BY prod.name ASC`,
        [pickupIds]
      );

      for (const item of itemsRes.rows) {
        if (!itemsByPickupId.has(item.pickup_id)) {
          itemsByPickupId.set(item.pickup_id, []);
        }
        itemsByPickupId.get(item.pickup_id)!.push({
          id: item.id,
          pickupId: item.pickup_id,
          productId: item.product_id,
          productName: item.product_name,
          productSku: item.product_sku,
          category: item.category,
          unit: item.unit,
          requiredQuantity: Number(item.required_quantity || 0),
          collectedQuantity: Number(item.collected_quantity || 0),
          acceptedQuantity: Number(item.accepted_quantity || 0),
          rejectedQuantity: Number(item.rejected_quantity || 0),
          shortageQuantity: Number(item.shortage_quantity || 0),
          supplierPurchasePrice: Number(item.supplier_purchase_price || 0),
          taxRate: Number(item.tax_rate || 0),
          lineTotal: Number(item.line_total || 0),
          shortageReason: item.shortage_reason,
          verificationRemarks: item.verification_remarks,
          isBilled: Boolean(item.is_billed),
          billItemId: item.bill_item_id,
        });
      }
    }

    const items: PickupRecord[] = dataRes.rows.map((row: any) => {
      const pItems = itemsByPickupId.get(row.id) || [];
      const totalRequiredUnits = pItems.reduce((acc, it) => acc + it.requiredQuantity, 0);
      const totalCollectedUnits = pItems.reduce((acc, it) => acc + it.collectedQuantity, 0);
      const totalAcceptedUnits = pItems.reduce((acc, it) => acc + it.acceptedQuantity, 0);
      const totalRejectedUnits = pItems.reduce((acc, it) => acc + it.rejectedQuantity, 0);

      return {
        id: row.id,
        pickupReference: row.pickup_reference,
        runId: row.run_id,
        runCode: row.run_code,
        routeId: row.route_id,
        routeName: row.route_name,
        companyId: row.company_id,
        companyName: row.company_name,
        companyCode: row.company_code,
        driverId: row.driver_id,
        driverName: row.driver_name,
        driverPhone: row.driver_phone,
        vehicleRegistration: row.vehicle_registration,
        stopSequence: Number(row.stop_sequence || 1),
        status: row.status as PickupStatus,
        scheduledDate: row.scheduled_date ? String(row.scheduled_date).split('T')[0] : null,
        scheduledTimeWindow: row.scheduled_time_window,
        arrivalTime: row.arrival_time?.toISOString() || null,
        completedTime: row.completed_time?.toISOString() || null,
        verifiedAt: row.verified_at?.toISOString() || null,
        verifiedBy: row.verified_by,
        verifiedByName: row.verified_by_name,
        verificationNotes: row.verification_notes,
        discrepancyReason: row.discrepancy_reason,
        notes: row.notes,
        isBilled: Boolean(row.is_billed),
        billId: row.bill_id,
        billNumber: row.bill_number,
        totalRequiredUnits,
        totalCollectedUnits,
        totalAcceptedUnits,
        totalRejectedUnits,
        items: pItems,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Get single pickup record by ID with full item and company information
   */
  async getPickupById(pickupId: string): Promise<PickupRecord | null> {
    const listRes = await this.listPickups({ page: 1, limit: 1 });
    // Query directly for precise lookup
    const res = await query(
      `SELECT 
         p.id,
         COALESCE(p.pickup_reference, 'PCK-' || SUBSTRING(p.id::text, 1, 8)) as pickup_reference,
         p.run_id,
         dr.run_code,
         COALESCE(p.route_id, dr.route_id) as route_id,
         r.name as route_name,
         p.company_id,
         c.name as company_name,
         c.company_code,
         c.address_line_1,
         c.city,
         c.contact_person,
         c.phone as company_phone,
         c.email as company_email,
         COALESCE(p.driver_id, dr.driver_id) as driver_id,
         u.name as driver_name,
         u.phone as driver_phone,
         v.registration_number as vehicle_registration,
         p.stop_sequence,
         p.status,
         p.scheduled_date,
         p.scheduled_time_window,
         p.arrival_time,
         p.completed_time,
         p.verified_at,
         p.verified_by,
         vu.name as verified_by_name,
         p.verification_notes,
         p.discrepancy_reason,
         p.notes,
         p.is_billed,
         p.bill_id,
         sb.bill_number,
         p.created_at,
         p.updated_at
       FROM delivery_run_pickups p
       JOIN companies c ON c.id = p.company_id
       LEFT JOIN delivery_runs dr ON dr.id = p.run_id
       LEFT JOIN routes r ON r.id = COALESCE(p.route_id, dr.route_id)
       LEFT JOIN users u ON u.id = COALESCE(p.driver_id, dr.driver_id)
       LEFT JOIN vehicles v ON v.id = dr.vehicle_id
       LEFT JOIN users vu ON vu.id = p.verified_by
       LEFT JOIN supplier_bills sb ON sb.id = p.bill_id
       WHERE p.id = $1`,
      [pickupId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const itemsRes = await query(
      `SELECT 
         pi.id,
         pi.pickup_id,
         pi.product_id,
         prod.name as product_name,
         prod.sku as product_sku,
         prod.category,
         COALESCE(pi.unit, prod.base_unit, 'Unit') as unit,
         pi.required_quantity,
         pi.collected_quantity,
         pi.accepted_quantity,
         pi.rejected_quantity,
         pi.shortage_quantity,
         COALESCE(pi.supplier_purchase_price, prod.purchase_cost, 0.00) as supplier_purchase_price,
         COALESCE(pi.tax_rate, prod.tax_rate, 0.00) as tax_rate,
         pi.line_total,
         pi.shortage_reason,
         pi.verification_remarks,
         pi.is_billed,
         pi.bill_item_id
       FROM delivery_run_pickup_items pi
       JOIN products prod ON prod.id = pi.product_id
       WHERE pi.pickup_id = $1
       ORDER BY prod.name ASC`,
      [pickupId]
    );

    const items: PickupRecordItem[] = itemsRes.rows.map((it: any) => ({
      id: it.id,
      pickupId: it.pickup_id,
      productId: it.product_id,
      productName: it.product_name,
      productSku: it.product_sku,
      category: it.category,
      unit: it.unit,
      requiredQuantity: Number(it.required_quantity || 0),
      collectedQuantity: Number(it.collected_quantity || 0),
      acceptedQuantity: Number(it.accepted_quantity || 0),
      rejectedQuantity: Number(it.rejected_quantity || 0),
      shortageQuantity: Number(it.shortage_quantity || 0),
      supplierPurchasePrice: Number(it.supplier_purchase_price || 0),
      taxRate: Number(it.tax_rate || 0),
      lineTotal: Number(it.line_total || 0),
      shortageReason: it.shortage_reason,
      verificationRemarks: it.verification_remarks,
      isBilled: Boolean(it.is_billed),
      billItemId: it.bill_item_id,
    }));

    return {
      id: row.id,
      pickupReference: row.pickup_reference,
      runId: row.run_id,
      runCode: row.run_code,
      routeId: row.route_id,
      routeName: row.route_name,
      companyId: row.company_id,
      companyName: row.company_name,
      companyCode: row.company_code,
      driverId: row.driver_id,
      driverName: row.driver_name,
      driverPhone: row.driver_phone,
      vehicleRegistration: row.vehicle_registration,
      stopSequence: Number(row.stop_sequence || 1),
      status: row.status as PickupStatus,
      scheduledDate: row.scheduled_date ? String(row.scheduled_date).split('T')[0] : null,
      scheduledTimeWindow: row.scheduled_time_window,
      arrivalTime: row.arrival_time?.toISOString() || null,
      completedTime: row.completed_time?.toISOString() || null,
      verifiedAt: row.verified_at?.toISOString() || null,
      verifiedBy: row.verified_by,
      verifiedByName: row.verified_by_name,
      verificationNotes: row.verification_notes,
      discrepancyReason: row.discrepancy_reason,
      notes: row.notes,
      isBilled: Boolean(row.is_billed),
      billId: row.bill_id,
      billNumber: row.bill_number,
      totalRequiredUnits: items.reduce((acc, it) => acc + it.requiredQuantity, 0),
      totalCollectedUnits: items.reduce((acc, it) => acc + it.collectedQuantity, 0),
      totalAcceptedUnits: items.reduce((acc, it) => acc + it.acceptedQuantity, 0),
      totalRejectedUnits: items.reduce((acc, it) => acc + it.rejectedQuantity, 0),
      items,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  },

  /**
   * Verify collected pickup quantities, establishing accepted vs rejected quantities
   */
  async verifyPickupQuantities(
    pickupId: string,
    data: {
      items: Array<{
        itemId: string;
        acceptedQuantity: number;
        rejectedQuantity: number;
        shortageQuantity?: number;
        supplierPurchasePrice?: number;
        verificationRemarks?: string;
      }>;
      verificationNotes?: string;
      status?: PickupStatus;
    },
    verifiedByUserId: string
  ): Promise<PickupRecord> {
    const pickup = await this.getPickupById(pickupId);
    if (!pickup) {
      throw new AppError('Pickup record not found', 404);
    }

    if (pickup.isBilled) {
      throw new AppError('Cannot re-verify or modify quantities of an already billed pickup', 400);
    }

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      for (const item of data.items) {
        const itemRes = await client.query(
          `SELECT pi.*, p.purchase_cost, p.tax_rate
           FROM delivery_run_pickup_items pi
           JOIN products p ON p.id = pi.product_id
           WHERE pi.id = $1 AND pi.pickup_id = $2`,
          [item.itemId, pickupId]
        );

        if (itemRes.rows.length === 0) continue;
        const currentItem = itemRes.rows[0];

        const acceptedQty = Math.max(0, Number(item.acceptedQuantity || 0));
        const rejectedQty = Math.max(0, Number(item.rejectedQuantity || 0));
        const requiredQty = Number(currentItem.required_quantity || 0);
        const collectedQty = Number(currentItem.collected_quantity || 0);
        const shortageQty = item.shortageQuantity !== undefined
          ? Math.max(0, Number(item.shortageQuantity))
          : Math.max(0, requiredQty - collectedQty);

        const purchasePrice = item.supplierPurchasePrice !== undefined
          ? Math.max(0, Number(item.supplierPurchasePrice))
          : Number(currentItem.supplier_purchase_price || currentItem.purchase_cost || 0);

        const lineTotal = Math.round(acceptedQty * purchasePrice * 100) / 100;

        await client.query(
          `UPDATE delivery_run_pickup_items
           SET accepted_quantity = $1,
               rejected_quantity = $2,
               shortage_quantity = $3,
               supplier_purchase_price = $4,
               line_total = $5,
               verification_remarks = $6,
               updated_at = NOW()
           WHERE id = $7`,
          [
            acceptedQty,
            rejectedQty,
            shortageQty,
            purchasePrice,
            lineTotal,
            item.verificationRemarks || null,
            item.itemId,
          ]
        );
      }

      const finalStatus: PickupStatus = data.status || 'VERIFIED';

      await client.query(
        `UPDATE delivery_run_pickups
         SET status = $1,
             verified_at = NOW(),
             verified_by = $2,
             verification_notes = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [finalStatus, verifiedByUserId, data.verificationNotes || null, pickupId]
      );

      await client.query('COMMIT');
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const updated = await this.getPickupById(pickupId);
    return updated!;
  },

  /**
   * Schedule or update supplier pickup schedule
   */
  async schedulePickup(data: {
    companyId: string;
    runId?: string;
    routeId?: string;
    driverId?: string;
    scheduledDate: string;
    scheduledTimeWindow?: string;
    items: Array<{ productId: string; requiredQuantity: number; unit?: string }>;
    notes?: string;
  }, createdByUserId: string): Promise<PickupRecord> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const pickupRef = await this.getNextSequence('PCK');

      const pRes = await client.query(
        `INSERT INTO delivery_run_pickups (
           pickup_reference, company_id, run_id, route_id, driver_id,
           scheduled_date, scheduled_time_window, status, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED', $8)
         RETURNING id`,
        [
          pickupRef,
          data.companyId,
          data.runId || null,
          data.routeId || null,
          data.driverId || null,
          data.scheduledDate,
          data.scheduledTimeWindow || '05:00 AM - 07:00 AM',
          data.notes || null,
        ]
      );

      const pickupId = pRes.rows[0].id;

      for (const item of data.items) {
        const prodRes = await client.query(
          `SELECT purchase_cost, tax_rate, base_unit FROM products WHERE id = $1`,
          [item.productId]
        );
        const prod = prodRes.rows[0];
        const unit = item.unit || prod?.base_unit || 'Unit';
        const cost = Number(prod?.purchase_cost || 0);
        const taxRate = Number(prod?.tax_rate || 0);

        await client.query(
          `INSERT INTO delivery_run_pickup_items (
             pickup_id, product_id, required_quantity, collected_quantity,
             accepted_quantity, rejected_quantity, shortage_quantity,
             unit, supplier_purchase_price, tax_rate, line_total
           ) VALUES ($1, $2, $3, 0, 0, 0, $3, $4, $5, $6, 0.00)`,
          [pickupId, item.productId, item.requiredQuantity, unit, cost, taxRate]
        );
      }

      await client.query('COMMIT');
      const record = await this.getPickupById(pickupId);
      return record!;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Generate finalized supplier bill from verified pickups
   * Implements strict duplicate billing prevention and decimal-safe financial calculations.
   */
  async generateSupplierBill(
    companyId: string,
    data: {
      pickupIds?: string[];
      billingPeriodStart: string;
      billingPeriodEnd: string;
      dueDate?: string;
      adjustmentsAmount?: number;
      adjustmentReason?: string;
      notes?: string;
    },
    createdByUserId: string
  ): Promise<SupplierBill> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Verify company exists
      const compRes = await client.query(
        `SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL`,
        [companyId]
      );
      if (compRes.rows.length === 0) {
        throw new AppError('Supplier company not found', 404);
      }
      const company = compRes.rows[0];

      // 2. Identify eligible unbilled verified pickups
      let pickupQuery = `
        SELECT p.id, p.pickup_reference, p.scheduled_date
        FROM delivery_run_pickups p
        WHERE p.company_id = $1 
          AND p.is_billed = false 
          AND p.status IN ('VERIFIED', 'COLLECTED', 'PARTIALLY_COLLECTED')
      `;
      const pickupQueryParams: any[] = [companyId];
      let pIdx = 2;

      if (data.pickupIds && data.pickupIds.length > 0) {
        pickupQuery += ` AND p.id = ANY($${pIdx})`;
        pickupQueryParams.push(data.pickupIds);
        pIdx++;
      } else {
        pickupQuery += ` AND COALESCE(p.scheduled_date, p.created_at::date) >= $${pIdx}::date AND COALESCE(p.scheduled_date, p.created_at::date) <= $${pIdx + 1}::date`;
        pickupQueryParams.push(data.billingPeriodStart, data.billingPeriodEnd);
        pIdx += 2;
      }

      const eligiblePickupsRes = await client.query(pickupQuery, pickupQueryParams);
      if (eligiblePickupsRes.rows.length === 0) {
        throw new AppError(
          'No eligible verified unbilled pickup records found for the selected company and period.',
          400
        );
      }

      const eligiblePickupIds = eligiblePickupsRes.rows.map((r: any) => r.id);

      // Verify that none of these pickups are already billed (Duplicate billing prevention)
      const duplicateCheckRes = await client.query(
        `SELECT id, pickup_reference FROM delivery_run_pickups WHERE id = ANY($1) AND is_billed = true`,
        [eligiblePickupIds]
      );
      if (duplicateCheckRes.rows.length > 0) {
        const refs = duplicateCheckRes.rows.map((r: any) => r.pickup_reference).join(', ');
        throw new AppError(`Cannot generate bill: Pickups [${refs}] have already been billed.`, 400);
      }

      // 3. Fetch all pickup items for these pickups
      const itemsRes = await client.query(
        `SELECT 
           pi.id as pickup_item_id,
           pi.pickup_id,
           p.pickup_reference,
           p.scheduled_date,
           pi.product_id,
           prod.name as product_name,
           prod.sku as product_sku,
           prod.category,
           COALESCE(pi.unit, prod.base_unit, 'Unit') as unit,
           pi.required_quantity,
           pi.collected_quantity,
           COALESCE(pi.accepted_quantity, pi.collected_quantity) as accepted_quantity,
           COALESCE(pi.rejected_quantity, 0) as rejected_quantity,
           COALESCE(pi.shortage_quantity, 0) as shortage_quantity,
           COALESCE(pi.supplier_purchase_price, prod.purchase_cost, 0.00) as unit_price,
           COALESCE(pi.tax_rate, prod.tax_rate, 0.00) as tax_rate
         FROM delivery_run_pickup_items pi
         JOIN delivery_run_pickups p ON p.id = pi.pickup_id
         JOIN products prod ON prod.id = pi.product_id
         WHERE pi.pickup_id = ANY($1) AND pi.is_billed = false
         ORDER BY p.scheduled_date ASC, prod.name ASC`,
        [eligiblePickupIds]
      );

      if (itemsRes.rows.length === 0) {
        throw new AppError('No unbilled product items found in the selected pickups', 400);
      }

      // 4. Decimal-safe monetary arithmetic
      let subtotalAmount = 0;
      let taxAmount = 0;

      const calculatedBillItems: any[] = [];

      for (const row of itemsRes.rows) {
        const acceptedQty = Number(row.accepted_quantity || 0);
        const unitPrice = Number(row.unit_price || 0);
        const taxRate = Number(row.tax_rate || 0);

        // Product subtotal = accepted/billable quantity × agreed supplier unit price
        const lineSubtotal = Math.round(acceptedQty * unitPrice * 100) / 100;
        const lineTax = Math.round(lineSubtotal * (taxRate / 100) * 100) / 100;
        const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

        subtotalAmount += lineSubtotal;
        taxAmount += lineTax;

        calculatedBillItems.push({
          ...row,
          acceptedQuantity: acceptedQty,
          unitPrice,
          taxRate,
          taxAmount: lineTax,
          subtotal: lineSubtotal,
          lineTotal,
        });
      }

      subtotalAmount = Math.round(subtotalAmount * 100) / 100;
      taxAmount = Math.round(taxAmount * 100) / 100;
      const adjustmentsAmount = Math.round(Number(data.adjustmentsAmount || 0) * 100) / 100;
      const totalAmount = Math.round((subtotalAmount + taxAmount + adjustmentsAmount) * 100) / 100;

      // 5. Compute due date based on payment terms
      let dueDate = data.dueDate;
      if (!dueDate) {
        const terms = company.payment_terms || 'NET_15';
        let daysToAdd = 15;
        if (terms === 'NET_7') daysToAdd = 7;
        else if (terms === 'NET_30') daysToAdd = 30;
        else if (terms === 'DUE_ON_RECEIPT') daysToAdd = 0;

        const d = new Date();
        d.setDate(d.getDate() + daysToAdd);
        dueDate = d.toISOString().split('T')[0];
      }

      // 6. Generate unique bill number
      const billNumber = await this.getNextSequence('BILL');

      // 7. Insert supplier_bills
      const billRes = await client.query(
        `INSERT INTO supplier_bills (
           bill_number, company_id, billing_period_start, billing_period_end,
           bill_date, due_date, status, payment_status,
           subtotal_amount, tax_amount, adjustments_amount, adjustment_reason,
           total_amount, paid_amount, outstanding_balance, currency,
           notes, created_by, verified_by, verified_at
         ) VALUES (
           $1, $2, $3, $4, CURRENT_DATE, $5, 'FINALIZED', 'UNPAID',
           $6, $7, $8, $9, $10, 0.00, $10, 'INR',
           $11, $12, $12, NOW()
         ) RETURNING *`,
        [
          billNumber,
          companyId,
          data.billingPeriodStart,
          data.billingPeriodEnd,
          dueDate,
          subtotalAmount,
          taxAmount,
          adjustmentsAmount,
          data.adjustmentReason || null,
          totalAmount,
          data.notes || null,
          createdByUserId,
        ]
      );
      const billRecord = billRes.rows[0];

      // 8. Insert supplier_bill_items and mark pickup items billed
      for (const item of calculatedBillItems) {
        const biRes = await client.query(
          `INSERT INTO supplier_bill_items (
             bill_id, pickup_id, pickup_item_id, product_id,
             product_name, product_sku, category, unit,
             required_quantity, collected_quantity, accepted_quantity,
             rejected_quantity, shortage_quantity, unit_price,
             tax_rate, tax_amount, subtotal, line_total, notes
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14,
             $15, $16, $17, $18, $19
           ) RETURNING id`,
          [
            billRecord.id,
            item.pickup_id,
            item.pickup_item_id,
            item.product_id,
            item.product_name,
            item.product_sku,
            item.category || null,
            item.unit,
            item.required_quantity,
            item.collected_quantity,
            item.acceptedQuantity,
            item.rejected_quantity,
            item.shortage_quantity,
            item.unitPrice,
            item.taxRate,
            item.taxAmount,
            item.subtotal,
            item.lineTotal,
            null,
          ]
        );

        // Mark individual pickup item as billed with foreign key
        await client.query(
          `UPDATE delivery_run_pickup_items
           SET is_billed = true, bill_item_id = $1, updated_at = NOW()
           WHERE id = $2`,
          [biRes.rows[0].id, item.pickup_item_id]
        );
      }

      // 9. Mark pickup records as billed
      await client.query(
        `UPDATE delivery_run_pickups
         SET is_billed = true, bill_id = $1, updated_at = NOW()
         WHERE id = ANY($2)`,
        [billRecord.id, eligiblePickupIds]
      );

      await client.query('COMMIT');

      const finalizedBill = await this.getBillById(billRecord.id);
      return finalizedBill!;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * List supplier bills with pagination and filters
   */
  async listBills(params: {
    companyId?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: SupplierBill[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.companyId) {
      conditions.push(`(b.company_id::text = $${idx} OR c.company_code = $${idx})`);
      values.push(params.companyId);
      idx++;
    }

    if (params.status) {
      conditions.push(`b.status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    if (params.paymentStatus) {
      conditions.push(`b.payment_status = $${idx}`);
      values.push(params.paymentStatus);
      idx++;
    }

    if (params.startDate) {
      conditions.push(`b.bill_date >= $${idx}::date`);
      values.push(params.startDate);
      idx++;
    }

    if (params.endDate) {
      conditions.push(`b.bill_date <= $${idx}::date`);
      values.push(params.endDate);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*)::text as count
       FROM supplier_bills b
       JOIN companies c ON c.id = b.company_id
       ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const billsRes = await query(
      `SELECT 
         b.*,
         c.name as company_name,
         c.company_code,
         c.address_line_1 as company_address,
         c.contact_person as company_contact_person,
         c.phone as company_phone,
         c.email as company_email,
         c.gstin as company_gstin,
         u.name as created_by_name,
         vu.name as verified_by_name,
         au.name as approved_by_name,
         ARRAY(
           SELECT DISTINCT p.pickup_reference
           FROM delivery_run_pickups p
           WHERE p.bill_id = b.id
         ) as pickup_references
       FROM supplier_bills b
       JOIN companies c ON c.id = b.company_id
       LEFT JOIN users u ON u.id = b.created_by
       LEFT JOIN users vu ON vu.id = b.verified_by
       LEFT JOIN users au ON au.id = b.approved_by
       ${whereClause}
       ORDER BY b.bill_date DESC, b.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    const billIds = billsRes.rows.map((r: any) => r.id);
    let itemsMap = new Map<string, SupplierBillItem[]>();
    let paymentsMap = new Map<string, SupplierPayment[]>();

    if (billIds.length > 0) {
      const itemsRes = await query(
        `SELECT bi.*, p.pickup_reference, p.scheduled_date as pickup_date
         FROM supplier_bill_items bi
         LEFT JOIN delivery_run_pickups p ON p.id = bi.pickup_id
         WHERE bi.bill_id = ANY($1)
         ORDER BY bi.product_name ASC`,
        [billIds]
      );
      for (const it of itemsRes.rows) {
        if (!itemsMap.has(it.bill_id)) itemsMap.set(it.bill_id, []);
        itemsMap.get(it.bill_id)!.push({
          id: it.id,
          billId: it.bill_id,
          pickupId: it.pickup_id,
          pickupItemId: it.pickup_item_id,
          pickupReference: it.pickup_reference,
          pickupDate: it.pickup_date ? String(it.pickup_date).split('T')[0] : null,
          productId: it.product_id,
          productName: it.product_name,
          productSku: it.product_sku,
          category: it.category,
          unit: it.unit,
          requiredQuantity: Number(it.required_quantity || 0),
          collectedQuantity: Number(it.collected_quantity || 0),
          acceptedQuantity: Number(it.accepted_quantity || 0),
          rejectedQuantity: Number(it.rejected_quantity || 0),
          shortageQuantity: Number(it.shortage_quantity || 0),
          unitPrice: Number(it.unit_price || 0),
          taxRate: Number(it.tax_rate || 0),
          taxAmount: Number(it.tax_amount || 0),
          subtotal: Number(it.subtotal || 0),
          lineTotal: Number(it.line_total || 0),
          notes: it.notes,
          createdAt: it.created_at.toISOString(),
        });
      }

      const paymentsRes = await query(
        `SELECT sp.*, u.name as recorded_by_name
         FROM supplier_payments sp
         LEFT JOIN users u ON u.id = sp.recorded_by
         WHERE sp.bill_id = ANY($1)
         ORDER BY sp.payment_date DESC`,
        [billIds]
      );
      for (const p of paymentsRes.rows) {
        if (!paymentsMap.has(p.bill_id)) paymentsMap.set(p.bill_id, []);
        paymentsMap.get(p.bill_id)!.push({
          id: p.id,
          paymentNumber: p.payment_number,
          billId: p.bill_id,
          companyId: p.company_id,
          amount: Number(p.amount),
          paymentDate: p.payment_date.toISOString(),
          paymentMethod: p.payment_method as PaymentMethod,
          transactionReference: p.transaction_reference,
          status: p.status,
          recordedBy: p.recorded_by,
          recordedByName: p.recorded_by_name,
          notes: p.notes,
          createdAt: p.created_at.toISOString(),
        });
      }
    }

    const items: SupplierBill[] = billsRes.rows.map((row: any) => ({
      id: row.id,
      billNumber: row.bill_number,
      companyId: row.company_id,
      companyName: row.company_name,
      companyCode: row.company_code,
      companyAddress: row.company_address,
      companyContactPerson: row.company_contact_person,
      companyPhone: row.company_phone,
      companyEmail: row.company_email,
      companyGstin: row.company_gstin,
      billingPeriodStart: String(row.billing_period_start).split('T')[0],
      billingPeriodEnd: String(row.billing_period_end).split('T')[0],
      billDate: String(row.bill_date).split('T')[0],
      dueDate: String(row.due_date).split('T')[0],
      status: row.status as BillStatus,
      paymentStatus: row.payment_status as BillPaymentStatus,
      subtotalAmount: Number(row.subtotal_amount || 0),
      taxAmount: Number(row.tax_amount || 0),
      adjustmentsAmount: Number(row.adjustments_amount || 0),
      adjustmentReason: row.adjustment_reason,
      totalAmount: Number(row.total_amount || 0),
      paidAmount: Number(row.paid_amount || 0),
      outstandingBalance: Number(row.outstanding_balance || 0),
      currency: row.currency || 'INR',
      notes: row.notes,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      verifiedBy: row.verified_by,
      verifiedByName: row.verified_by_name,
      verifiedAt: row.verified_at?.toISOString() || null,
      approvedBy: row.approved_by,
      approvedByName: row.approved_by_name,
      approvedAt: row.approved_at?.toISOString() || null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      items: itemsMap.get(row.id) || [],
      payments: paymentsMap.get(row.id) || [],
      pickupReferences: row.pickup_references || [],
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Get single supplier bill by ID with full detail
   */
  async getBillById(billId: string): Promise<SupplierBill | null> {
    const listRes = await this.listBills({ page: 1, limit: 1 });
    // Execute query for single record
    const res = await query(
      `SELECT 
         b.*,
         c.name as company_name,
         c.company_code,
         c.address_line_1 as company_address,
         c.contact_person as company_contact_person,
         c.phone as company_phone,
         c.email as company_email,
         c.gstin as company_gstin,
         u.name as created_by_name,
         vu.name as verified_by_name,
         au.name as approved_by_name,
         ARRAY(
           SELECT DISTINCT p.pickup_reference
           FROM delivery_run_pickups p
           WHERE p.bill_id = b.id
         ) as pickup_references
       FROM supplier_bills b
       JOIN companies c ON c.id = b.company_id
       LEFT JOIN users u ON u.id = b.created_by
       LEFT JOIN users vu ON vu.id = b.verified_by
       LEFT JOIN users au ON au.id = b.approved_by
       WHERE b.id = $1`,
      [billId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const itemsRes = await query(
      `SELECT bi.*, p.pickup_reference, p.scheduled_date as pickup_date
       FROM supplier_bill_items bi
       LEFT JOIN delivery_run_pickups p ON p.id = bi.pickup_id
       WHERE bi.bill_id = $1
       ORDER BY bi.product_name ASC`,
      [billId]
    );

    const items: SupplierBillItem[] = itemsRes.rows.map((it: any) => ({
      id: it.id,
      billId: it.bill_id,
      pickupId: it.pickup_id,
      pickupItemId: it.pickup_item_id,
      pickupReference: it.pickup_reference,
      pickupDate: it.pickup_date ? String(it.pickup_date).split('T')[0] : null,
      productId: it.product_id,
      productName: it.product_name,
      productSku: it.product_sku,
      category: it.category,
      unit: it.unit,
      requiredQuantity: Number(it.required_quantity || 0),
      collectedQuantity: Number(it.collected_quantity || 0),
      acceptedQuantity: Number(it.accepted_quantity || 0),
      rejectedQuantity: Number(it.rejected_quantity || 0),
      shortageQuantity: Number(it.shortage_quantity || 0),
      unitPrice: Number(it.unit_price || 0),
      taxRate: Number(it.tax_rate || 0),
      taxAmount: Number(it.tax_amount || 0),
      subtotal: Number(it.subtotal || 0),
      lineTotal: Number(it.line_total || 0),
      notes: it.notes,
      createdAt: it.created_at.toISOString(),
    }));

    const paymentsRes = await query(
      `SELECT sp.*, u.name as recorded_by_name
       FROM supplier_payments sp
       LEFT JOIN users u ON u.id = sp.recorded_by
       WHERE sp.bill_id = $1
       ORDER BY sp.payment_date DESC`,
      [billId]
    );

    const payments: SupplierPayment[] = paymentsRes.rows.map((p: any) => ({
      id: p.id,
      paymentNumber: p.payment_number,
      billId: p.bill_id,
      companyId: p.company_id,
      amount: Number(p.amount),
      paymentDate: p.payment_date.toISOString(),
      paymentMethod: p.payment_method as PaymentMethod,
      transactionReference: p.transaction_reference,
      status: p.status,
      recordedBy: p.recorded_by,
      recordedByName: p.recorded_by_name,
      notes: p.notes,
      createdAt: p.created_at.toISOString(),
    }));

    return {
      id: row.id,
      billNumber: row.bill_number,
      companyId: row.company_id,
      companyName: row.company_name,
      companyCode: row.company_code,
      companyAddress: row.company_address,
      companyContactPerson: row.company_contact_person,
      companyPhone: row.company_phone,
      companyEmail: row.company_email,
      companyGstin: row.company_gstin,
      billingPeriodStart: String(row.billing_period_start).split('T')[0],
      billingPeriodEnd: String(row.billing_period_end).split('T')[0],
      billDate: String(row.bill_date).split('T')[0],
      dueDate: String(row.due_date).split('T')[0],
      status: row.status as BillStatus,
      paymentStatus: row.payment_status as BillPaymentStatus,
      subtotalAmount: Number(row.subtotal_amount || 0),
      taxAmount: Number(row.tax_amount || 0),
      adjustmentsAmount: Number(row.adjustments_amount || 0),
      adjustmentReason: row.adjustment_reason,
      totalAmount: Number(row.total_amount || 0),
      paidAmount: Number(row.paid_amount || 0),
      outstandingBalance: Number(row.outstanding_balance || 0),
      currency: row.currency || 'INR',
      notes: row.notes,
      createdBy: row.created_by,
      createdByName: row.created_by_name,
      verifiedBy: row.verified_by,
      verifiedByName: row.verified_by_name,
      verifiedAt: row.verified_at?.toISOString() || null,
      approvedBy: row.approved_by,
      approvedByName: row.approved_by_name,
      approvedAt: row.approved_at?.toISOString() || null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      items,
      payments,
      pickupReferences: row.pickup_references || [],
    };
  },

  /**
   * Record payment against a supplier bill with decimal-safe balance validation
   */
  async recordPayment(
    billId: string,
    data: {
      amount: number;
      paymentMethod: PaymentMethod;
      transactionReference?: string;
      notes?: string;
    },
    recordedByUserId: string
  ): Promise<{ payment: SupplierPayment; bill: SupplierBill }> {
    const amount = Math.round(Number(data.amount || 0) * 100) / 100;
    if (amount <= 0) {
      throw new AppError('Payment amount must be greater than zero', 400);
    }

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const billRes = await client.query(
        `SELECT * FROM supplier_bills WHERE id = $1 FOR UPDATE`,
        [billId]
      );
      if (billRes.rows.length === 0) {
        throw new AppError('Supplier bill not found', 404);
      }
      const bill = billRes.rows[0];

      if (bill.status === 'CANCELLED') {
        throw new AppError('Cannot record payment against a cancelled bill', 400);
      }

      const currentBalance = Number(bill.outstanding_balance || 0);
      if (amount > currentBalance + 0.01) {
        throw new AppError(
          `Payment amount (₹${amount}) exceeds outstanding balance (₹${currentBalance}). Overpayments are not permitted.`,
          400
        );
      }

      const paymentNumber = await this.getNextSequence('PAY');

      const payRes = await client.query(
        `INSERT INTO supplier_payments (
           payment_number, bill_id, company_id, amount,
           payment_method, transaction_reference, status,
           recorded_by, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, 'COMPLETED', $7, $8)
         RETURNING *`,
        [
          paymentNumber,
          billId,
          bill.company_id,
          amount,
          data.paymentMethod,
          data.transactionReference || null,
          recordedByUserId,
          data.notes || null,
        ]
      );
      const paymentRow = payRes.rows[0];

      const newPaid = Math.round((Number(bill.paid_amount || 0) + amount) * 100) / 100;
      const newBalance = Math.max(0, Math.round((Number(bill.total_amount || 0) - newPaid) * 100) / 100);
      const newPaymentStatus = newBalance <= 0.00 ? 'PAID' : (newPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID');

      await client.query(
        `UPDATE supplier_bills
         SET paid_amount = $1,
             outstanding_balance = $2,
             payment_status = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [newPaid, newBalance, newPaymentStatus, billId]
      );

      await client.query('COMMIT');

      const updatedBill = await this.getBillById(billId);

      const payment: SupplierPayment = {
        id: paymentRow.id,
        paymentNumber: paymentRow.payment_number,
        billId: paymentRow.bill_id,
        billNumber: updatedBill?.billNumber,
        companyId: paymentRow.company_id,
        amount: Number(paymentRow.amount),
        paymentDate: paymentRow.payment_date.toISOString(),
        paymentMethod: paymentRow.payment_method,
        transactionReference: paymentRow.transaction_reference,
        status: paymentRow.status,
        recordedBy: paymentRow.recorded_by,
        notes: paymentRow.notes,
        createdAt: paymentRow.created_at.toISOString(),
      };

      return { payment, bill: updatedBill! };
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get all-time supplier financial summary
   */
  async getSupplierFinancialSummary(companyId: string): Promise<SupplierFinancialSummary> {
    const billsRes = await query(
      `SELECT 
         COUNT(*)::int as total_bills,
         COUNT(CASE WHEN payment_status != 'PAID' THEN 1 END)::int as unpaid_bills,
         COALESCE(SUM(total_amount), 0.00)::numeric as total_payable,
         COALESCE(SUM(paid_amount), 0.00)::numeric as total_paid,
         COALESCE(SUM(outstanding_balance), 0.00)::numeric as outstanding_balance
       FROM supplier_bills
       WHERE company_id = $1 AND status != 'CANCELLED'`,
      [companyId]
    );
    const bRow = billsRes.rows[0];

    const pickupsRes = await query(
      `SELECT 
         COUNT(*)::int as total_pickups,
         COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END)::int as verified_pickups,
         COUNT(CASE WHEN is_billed = false AND status IN ('VERIFIED', 'COLLECTED', 'PARTIALLY_COLLECTED') THEN 1 END)::int as unbilled_pickups
       FROM delivery_run_pickups
       WHERE company_id = $1`,
      [companyId]
    );
    const pRow = pickupsRes.rows[0];

    return {
      companyId,
      totalFinalizedPayable: Number(bRow?.total_payable || 0),
      totalPaidAmount: Number(bRow?.total_paid || 0),
      outstandingBalance: Number(bRow?.outstanding_balance || 0),
      totalBillsCount: Number(bRow?.total_bills || 0),
      unpaidBillsCount: Number(bRow?.unpaid_bills || 0),
      totalPickupsCount: Number(pRow?.total_pickups || 0),
      verifiedPickupsCount: Number(pRow?.verified_pickups || 0),
      unbilledPickupsCount: Number(pRow?.unbilled_pickups || 0),
    };
  },
};
