import { query, dbPool } from '../config/database.js';

export interface DeliveryCollectionRecord {
  id: string;
  receipt_number: string;
  run_id: string;
  run_code?: string;
  shop_id: string;
  shop_name?: string;
  driver_id: string;
  driver_name?: string;
  driver_employee_id?: string;
  amount: number;
  payment_method: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
  transaction_reference: string | null;
  notes: string | null;
  status: 'COLLECTED' | 'RECONCILED' | 'DEPOSITED' | 'DISPUTED';
  collected_at: string;
  reconciled_at: string | null;
  reconciled_by: string | null;
  created_at: string;
}

export const collectionRepository = {
  async createCollection(data: {
    runId: string;
    shopId: string;
    driverId: string;
    amount: number;
    paymentMethod: 'CASH' | 'UPI' | 'CHEQUE' | 'BANK_TRANSFER';
    transactionReference?: string;
    notes?: string;
  }): Promise<DeliveryCollectionRecord> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // Generate receipt number
      const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .format(new Date())
        .replace(/-/g, '');
      const countRes = await client.query<{ c: string }>(
        `SELECT COUNT(*)::text as c FROM delivery_collections WHERE receipt_number LIKE $1`,
        [`RCP-${dateStr}-%`]
      );
      const nextNum = (parseInt(countRes.rows[0]?.c || '0', 10) + 1).toString().padStart(3, '0');
      const receiptNumber = `RCP-${dateStr}-${nextNum}`;

      const res = await client.query<DeliveryCollectionRecord>(
        `INSERT INTO delivery_collections (
          receipt_number, run_id, shop_id, driver_id, amount,
          payment_method, transaction_reference, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'COLLECTED')
        RETURNING *`,
        [
          receiptNumber,
          data.runId,
          data.shopId,
          data.driverId,
          data.amount,
          data.paymentMethod,
          data.transactionReference || null,
          data.notes || null,
        ]
      );
      const created = res.rows[0];

      // Update stop collected_amount and payment_method if matching stop exists
      await client.query(
        `UPDATE delivery_run_stops
         SET collected_amount = COALESCE(collected_amount, 0) + $1,
             payment_method = $2
         WHERE run_id = $3 AND shop_id = $4`,
        [data.amount, data.paymentMethod, data.runId, data.shopId]
      );

      await client.query('COMMIT');
      return created;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async list(params?: {
    driverId?: string;
    shopId?: string;
    runId?: string;
    status?: string;
    paymentMethod?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<DeliveryCollectionRecord[]> {
    const where: string[] = ['1=1'];
    const values: any[] = [];

    if (params?.driverId) {
      values.push(params.driverId);
      where.push(`dc.driver_id = $${values.length}`);
    }
    if (params?.shopId) {
      values.push(params.shopId);
      where.push(`dc.shop_id = $${values.length}`);
    }
    if (params?.runId) {
      values.push(params.runId);
      where.push(`dc.run_id = $${values.length}`);
    }
    if (params?.status && params.status !== 'ALL') {
      values.push(params.status);
      where.push(`dc.status = $${values.length}`);
    }
    if (params?.paymentMethod && params.paymentMethod !== 'ALL') {
      values.push(params.paymentMethod);
      where.push(`dc.payment_method = $${values.length}`);
    }
    if (params?.search) {
      values.push(`%${params.search.toLowerCase().trim()}%`);
      const idx = values.length;
      where.push(
        `(LOWER(dc.receipt_number) LIKE $${idx} OR LOWER(s.name) LIKE $${idx} OR LOWER(u.name) LIKE $${idx} OR LOWER(u.employee_id) LIKE $${idx})`
      );
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    values.push(limit, offset);

    const res = await query<DeliveryCollectionRecord>(
      `SELECT dc.*,
              s.name as shop_name,
              u.name as driver_name,
              u.employee_id as driver_employee_id,
              dr.run_code
       FROM delivery_collections dc
       JOIN shops s ON dc.shop_id = s.id
       JOIN users u ON dc.driver_id = u.id
       JOIN delivery_runs dr ON dc.run_id = dr.id
       WHERE ${where.join(' AND ')}
       ORDER BY dc.collected_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return res.rows;
  },

  async getSummary(driverId?: string): Promise<{
    totalCollected: number;
    cashCollected: number;
    upiCollected: number;
    reconciledAmount: number;
    pendingReconciliation: number;
  }> {
    const where: string[] = ['1=1'];
    const values: any[] = [];
    if (driverId) {
      values.push(driverId);
      where.push(`driver_id = $1`);
    }

    const res = await query<{
      total: string;
      cash: string;
      upi: string;
      reconciled: string;
      pending: string;
    }>(
      `SELECT
        COALESCE(SUM(amount), 0)::text as total,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0)::text as cash,
        COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN amount ELSE 0 END), 0)::text as upi,
        COALESCE(SUM(CASE WHEN status IN ('RECONCILED', 'DEPOSITED') THEN amount ELSE 0 END), 0)::text as reconciled,
        COALESCE(SUM(CASE WHEN status = 'COLLECTED' THEN amount ELSE 0 END), 0)::text as pending
       FROM delivery_collections
       WHERE ${where.join(' AND ')}`,
      values
    );

    const r = res.rows[0] || { total: '0', cash: '0', upi: '0', reconciled: '0', pending: '0' };
    return {
      totalCollected: parseFloat(r.total) || 0,
      cashCollected: parseFloat(r.cash) || 0,
      upiCollected: parseFloat(r.upi) || 0,
      reconciledAmount: parseFloat(r.reconciled) || 0,
      pendingReconciliation: parseFloat(r.pending) || 0,
    };
  },

  async reconcile(id: string, reconciledBy: string, status: 'RECONCILED' | 'DEPOSITED' = 'RECONCILED'): Promise<DeliveryCollectionRecord | null> {
    const res = await query<DeliveryCollectionRecord>(
      `UPDATE delivery_collections
       SET status = $1,
           reconciled_at = NOW(),
           reconciled_by = $2
       WHERE id = $3
       RETURNING *`,
      [status, reconciledBy, id]
    );
    return res.rows[0] || null;
  },
};
