import { PoolClient } from 'pg';
import { dbPool } from '../config/database.js';
import {
  InventoryBatch,
  InventoryMovement,
  InventoryFilterParams,
  MovementType,
} from '../types/product.types.js';

export function toBatchDTO(row: any): InventoryBatch {
  return {
    id: row.id,
    productId: row.product_id,
    companyId: row.company_id || null,
    batchNumber: row.batch_number,
    manufacturingDate: row.manufacturing_date ? new Date(row.manufacturing_date).toISOString().split('T')[0] : null,
    expiryDate: new Date(row.expiry_date).toISOString().split('T')[0],
    quantityReceived: Number(row.quantity_received || 0),
    quantityRemaining: Number(row.quantity_remaining || 0),
    purchaseCost: Number(row.purchase_cost || 0),
    status: row.status,
    notes: row.notes || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toMovementDTO(row: any): InventoryMovement {
  return {
    id: row.id,
    movementNumber: row.movement_number,
    productId: row.product_id,
    productName: row.product_name,
    productSku: row.product_sku,
    batchId: row.batch_id || null,
    batchNumber: row.batch_number || null,
    movementType: row.movement_type as MovementType,
    quantityChange: Number(row.quantity_change),
    previousStock: Number(row.previous_stock),
    newStock: Number(row.new_stock),
    unitCost: Number(row.unit_cost || 0),
    referenceType: row.reference_type,
    referenceId: row.reference_id || null,
    reason: row.reason || null,
    actorId: row.actor_id || null,
    actorName: row.actor_name || null,
    createdAt: row.created_at,
  };
}

export const inventoryRepository = {
  async getBatchesByProductId(productId: string, client?: PoolClient): Promise<InventoryBatch[]> {
    const queryRunner = client || dbPool;
    const sql = `
      SELECT *
      FROM inventory_batches
      WHERE product_id = $1
      ORDER BY expiry_date ASC, created_at ASC;
    `;
    const res = await queryRunner.query(sql, [productId]);
    return res.rows.map(toBatchDTO);
  },

  async getBatchById(batchId: string, client?: PoolClient): Promise<InventoryBatch | null> {
    const queryRunner = client || dbPool;
    const sql = `
      SELECT *
      FROM inventory_batches
      WHERE id = $1
      LIMIT 1;
    `;
    const res = await queryRunner.query(sql, [batchId]);
    if (res.rows.length === 0) return null;
    return toBatchDTO(res.rows[0]);
  },

  async createBatch(
    client: PoolClient,
    data: {
      productId: string;
      companyId?: string | null;
      batchNumber: string;
      manufacturingDate?: string | null;
      expiryDate: string;
      quantityReceived: number;
      quantityRemaining: number;
      purchaseCost?: number;
      notes?: string | null;
    }
  ): Promise<InventoryBatch> {
    const sql = `
      INSERT INTO inventory_batches (
        product_id,
        company_id,
        batch_number,
        manufacturing_date,
        expiry_date,
        quantity_received,
        quantity_remaining,
        purchase_cost,
        status,
        notes,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', $9, NOW(), NOW())
      ON CONFLICT (product_id, batch_number)
      DO UPDATE SET
        quantity_received = inventory_batches.quantity_received + EXCLUDED.quantity_received,
        quantity_remaining = inventory_batches.quantity_remaining + EXCLUDED.quantity_remaining,
        status = 'ACTIVE',
        updated_at = NOW()
      RETURNING *;
    `;

    const res = await client.query(sql, [
      data.productId,
      data.companyId || null,
      data.batchNumber,
      data.manufacturingDate || null,
      data.expiryDate,
      data.quantityReceived,
      data.quantityRemaining,
      data.purchaseCost || 0,
      data.notes || null,
    ]);

    return toBatchDTO(res.rows[0]);
  },

  async updateBatchRemaining(
    client: PoolClient,
    batchId: string,
    quantityRemaining: number
  ): Promise<void> {
    const status = quantityRemaining <= 0 ? 'DEPLETED' : 'ACTIVE';
    await client.query(
      `UPDATE inventory_batches
       SET quantity_remaining = $1, status = $2, updated_at = NOW()
       WHERE id = $3;`,
      [quantityRemaining, status, batchId]
    );
  },

  async createMovement(
    client: PoolClient,
    data: {
      movementNumber: string;
      productId: string;
      batchId?: string | null;
      movementType: MovementType;
      quantityChange: number;
      previousStock: number;
      newStock: number;
      unitCost?: number;
      referenceType?: string;
      referenceId?: string | null;
      reason?: string | null;
      actorId?: string | null;
    }
  ): Promise<InventoryMovement> {
    // If actorId provided, verify it exists in users table to prevent FK crashes
    let safeActorId = data.actorId;
    if (safeActorId) {
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [safeActorId]);
      if (userCheck.rows.length === 0) {
        safeActorId = null;
      }
    }

    const sql = `
      INSERT INTO inventory_movements (
        movement_number,
        product_id,
        batch_id,
        movement_type,
        quantity_change,
        previous_stock,
        new_stock,
        unit_cost,
        reference_type,
        reference_id,
        reason,
        actor_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *;
    `;

    const res = await client.query(sql, [
      data.movementNumber,
      data.productId,
      data.batchId || null,
      data.movementType,
      data.quantityChange,
      data.previousStock,
      data.newStock,
      data.unitCost || 0,
      data.referenceType || 'MANUAL',
      data.referenceId || null,
      data.reason || null,
      safeActorId || null,
    ]);

    return toMovementDTO(res.rows[0]);
  },

  async listMovements(params: InventoryFilterParams = {}): Promise<{
    items: InventoryMovement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (params.productId) {
      conditions.push(`m.product_id = $${idx++}`);
      values.push(params.productId);
    }

    if (params.movementType) {
      conditions.push(`m.movement_type = $${idx++}`);
      values.push(params.movementType);
    }

    if (params.startDate) {
      conditions.push(`m.created_at >= $${idx++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`m.created_at <= $${idx++}`);
      values.push(params.endDate);
    }

    if (params.search && params.search.trim().length > 0) {
      conditions.push(
        `(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR m.movement_number ILIKE $${idx} OR m.reference_id ILIKE $${idx} OR b.batch_number ILIKE $${idx})`
      );
      values.push(`%${params.search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*)::text as count
      FROM inventory_movements m
      LEFT JOIN products p ON m.product_id = p.id
      LEFT JOIN inventory_batches b ON m.batch_id = b.id
      ${whereClause};
    `;
    const countRes = await dbPool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const dataSql = `
      SELECT 
        m.*,
        p.name AS product_name,
        p.sku AS product_sku,
        b.batch_number AS batch_number,
        COALESCE(u.email, 'Admin') AS actor_name
      FROM inventory_movements m
      LEFT JOIN products p ON m.product_id = p.id
      LEFT JOIN inventory_batches b ON m.batch_id = b.id
      LEFT JOIN users u ON m.actor_id = u.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    values.push(limit, offset);
    const dataRes = await dbPool.query(dataSql, values);

    return {
      items: dataRes.rows.map(toMovementDTO),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },
};
