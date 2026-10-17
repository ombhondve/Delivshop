import { PoolClient } from 'pg';
import { dbPool } from '../config/database.js';
import {
  Product,
  ProductRecord,
  ProductFilterParams,
  ProductSummaryStats,
  CreateProductInput,
  UpdateProductInput,
} from '../types/product.types.js';

export function toProductDTO(row: ProductRecord): Product {
  const stock = Number(row.stock_quantity || 0);
  const minThreshold = Number(row.min_stock_threshold || 10);

  let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
  if (stock === 0) {
    stockStatus = 'OUT_OF_STOCK';
  } else if (stock <= minThreshold) {
    stockStatus = 'LOW_STOCK';
  }

  let isExpiringSoon = false;
  if (row.nearest_expiry) {
    const expiryDate = new Date(row.nearest_expiry);
    const now = new Date();
    const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    isExpiringSoon = diffDays >= 0 && diffDays <= 7;
  }

  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    description: row.description || null,
    sku: row.sku,
    price: Number(row.price),
    stockQuantity: stock,
    category: row.category,
    isActive: Boolean(row.is_active),
    brand: row.brand || null,
    imageUrl: row.image_url || null,
    baseUnit: row.base_unit || 'Litre',
    packSize: row.pack_size || '1L Pouch',
    unitsPerPack: Number(row.units_per_pack || 1),
    purchaseUnit: row.purchase_unit || null,
    sellingUnit: row.selling_unit || null,
    purchaseCost: Number(row.purchase_cost || 0),
    minStockThreshold: minThreshold,
    reorderQuantity: Number(row.reorder_quantity || 50),
    taxRate: Number(row.tax_rate || 0),
    isTaxInclusive: Boolean(row.is_tax_inclusive ?? true),
    minSellingPrice: row.min_selling_price ? Number(row.min_selling_price) : null,
    trackInventory: Boolean(row.track_inventory ?? true),
    trackBatches: Boolean(row.track_batches ?? true),
    storageTemperature: row.storage_temperature || null,
    shelfLifeDays: row.shelf_life_days ? Number(row.shelf_life_days) : null,
    fatPercentage: row.fat_percentage ? Number(row.fat_percentage) : null,
    snfPercentage: row.snf_percentage ? Number(row.snf_percentage) : null,
    fssaiLicense: row.fssai_license || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    company: row.company_name
      ? {
          id: row.company_id,
          name: row.company_name,
          code: row.company_code || '',
          status: row.company_status || 'ACTIVE',
        }
      : null,
    stockStatus,
    batchesCount: Number(row.batches_count || 0),
    nearestExpiry: row.nearest_expiry || null,
    isExpiringSoon,
  };
}

export const productRepository = {
  async listProducts(params: ProductFilterParams = {}): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const isArchived = (params.status as string) === 'ARCHIVED' || (params.stockStatus as string) === 'ARCHIVED';
    const conditions: string[] = [isArchived ? 'p.deleted_at IS NOT NULL' : 'p.deleted_at IS NULL'];
    const values: any[] = [];
    let paramIdx = 1;

    // Search filter across name, SKU, and company name
    if (params.search && params.search.trim().length > 0) {
      conditions.push(
        `(p.name ILIKE $${paramIdx} OR p.sku ILIKE $${paramIdx} OR c.name ILIKE $${paramIdx} OR p.category ILIKE $${paramIdx})`
      );
      values.push(`%${params.search.trim()}%`);
      paramIdx++;
    }

    // Company filter
    if (params.companyId) {
      conditions.push(`p.company_id = $${paramIdx}`);
      values.push(params.companyId);
      paramIdx++;
    }

    // Category filter
    if (params.category && params.category.trim().length > 0) {
      conditions.push(`p.category = $${paramIdx}`);
      values.push(params.category.trim());
      paramIdx++;
    }

    // Status filter
    if (params.status) {
      conditions.push(`p.is_active = $${paramIdx}`);
      values.push(params.status === 'ACTIVE');
      paramIdx++;
    }

    // Stock Status Filter
    if (params.stockStatus) {
      if (params.stockStatus === 'ACTIVE') {
        conditions.push(`p.is_active = true`);
      } else if (params.stockStatus === 'INACTIVE') {
        conditions.push(`p.is_active = false`);
      } else if (params.stockStatus === 'LOW_STOCK') {
        conditions.push(`(p.stock_quantity <= p.min_stock_threshold AND p.stock_quantity > 0)`);
      } else if (params.stockStatus === 'OUT_OF_STOCK') {
        conditions.push(`p.stock_quantity = 0`);
      } else if (params.stockStatus === 'EXPIRING_SOON') {
        conditions.push(`EXISTS (
          SELECT 1 FROM inventory_batches b 
          WHERE b.product_id = p.id 
            AND b.status = 'ACTIVE' 
            AND b.quantity_remaining > 0
            AND b.expiry_date >= CURRENT_DATE 
            AND b.expiry_date <= (CURRENT_DATE + INTERVAL '7 days')
        )`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortColumns: Record<string, string> = {
      name: 'p.name',
      sku: 'p.sku',
      price: 'p.price',
      stock_quantity: 'p.stock_quantity',
      created_at: 'p.created_at',
      updated_at: 'p.updated_at',
    };

    const sortColumn = allowedSortColumns[params.sortBy || 'created_at'] || 'p.created_at';
    const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Count query
    const countSql = `
      SELECT COUNT(*)::text as count
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      ${whereClause};
    `;
    const countRes = await dbPool.query(countSql, values);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Fetch records with batch metrics
    const dataSql = `
      SELECT 
        p.*,
        c.name AS company_name,
        c.company_code AS company_code,
        c.status AS company_status,
        (SELECT COUNT(*) FROM inventory_batches b WHERE b.product_id = p.id AND b.status = 'ACTIVE') AS batches_count,
        (SELECT MIN(b.expiry_date)::text FROM inventory_batches b WHERE b.product_id = p.id AND b.status = 'ACTIVE' AND b.quantity_remaining > 0 AND b.expiry_date >= CURRENT_DATE) AS nearest_expiry
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
    `;

    values.push(limit, offset);
    const dataRes = await dbPool.query<ProductRecord>(dataSql, values);

    return {
      items: dataRes.rows.map(toProductDTO),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async getProductById(id: string, client?: PoolClient): Promise<Product | null> {
    const queryRunner = client || dbPool;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const sql = `
      SELECT 
        p.*,
        c.name AS company_name,
        c.company_code AS company_code,
        c.status AS company_status,
        (SELECT COUNT(*) FROM inventory_batches b WHERE b.product_id = p.id AND b.status = 'ACTIVE') AS batches_count,
        (SELECT MIN(b.expiry_date)::text FROM inventory_batches b WHERE b.product_id = p.id AND b.status = 'ACTIVE' AND b.quantity_remaining > 0 AND b.expiry_date >= CURRENT_DATE) AS nearest_expiry
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE ${isUuid ? 'p.id = $1' : 'p.sku = $1'} AND p.deleted_at IS NULL
      LIMIT 1;
    `;

    const res = await queryRunner.query<ProductRecord>(sql, [id]);
    if (res.rows.length === 0) return null;
    return toProductDTO(res.rows[0]);
  },

  async getProductBySku(sku: string, client?: PoolClient): Promise<Product | null> {
    const queryRunner = client || dbPool;
    const sql = `
      SELECT 
        p.*,
        c.name AS company_name,
        c.company_code AS company_code,
        c.status AS company_status
      FROM products p
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE LOWER(p.sku) = LOWER($1) AND p.deleted_at IS NULL
      LIMIT 1;
    `;
    const res = await queryRunner.query<ProductRecord>(sql, [sku]);
    if (res.rows.length === 0) return null;
    return toProductDTO(res.rows[0]);
  },

  async createProduct(input: CreateProductInput & { sku: string }, client?: PoolClient): Promise<Product> {
    const queryRunner = client || dbPool;

    const sql = `
      INSERT INTO products (
        company_id,
        name,
        sku,
        category,
        description,
        brand,
        image_url,
        is_active,
        base_unit,
        pack_size,
        units_per_pack,
        purchase_unit,
        selling_unit,
        purchase_cost,
        price,
        stock_quantity,
        min_stock_threshold,
        reorder_quantity,
        tax_rate,
        is_tax_inclusive,
        min_selling_price,
        track_inventory,
        track_batches,
        storage_temperature,
        shelf_life_days,
        fat_percentage,
        snf_percentage,
        fssai_license,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, NOW(), NOW()
      )
      RETURNING *;
    `;

    const values = [
      input.companyId,
      input.name,
      input.sku,
      input.category,
      input.description || null,
      input.brand || null,
      input.imageUrl || null,
      input.isActive ?? true,
      input.baseUnit,
      input.packSize,
      input.unitsPerPack || 1,
      input.purchaseUnit || null,
      input.sellingUnit || null,
      input.purchaseCost || 0,
      input.price,
      input.initialStock || 0,
      input.minStockThreshold ?? 10,
      input.reorderQuantity ?? 50,
      input.taxRate || 0,
      input.isTaxInclusive ?? true,
      input.minSellingPrice || null,
      input.trackInventory ?? true,
      input.trackBatches ?? true,
      input.storageTemperature || '2°C to 4°C (Refrigerated)',
      input.shelfLifeDays || null,
      input.fatPercentage || null,
      input.snfPercentage || null,
      input.fssaiLicense || null,
    ];

    const res = await queryRunner.query<ProductRecord>(sql, values);
    const createdId = res.rows[0].id;
    return (await this.getProductById(createdId, client))!;
  },

  async updateProduct(id: string, input: UpdateProductInput, client?: PoolClient): Promise<Product | null> {
    const queryRunner = client || dbPool;

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.companyId !== undefined) {
      fields.push(`company_id = $${idx++}`);
      values.push(input.companyId);
    }
    if (input.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(input.category);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(input.description);
    }
    if (input.brand !== undefined) {
      fields.push(`brand = $${idx++}`);
      values.push(input.brand);
    }
    if (input.imageUrl !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(input.imageUrl);
    }
    if (input.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }
    if (input.baseUnit !== undefined) {
      fields.push(`base_unit = $${idx++}`);
      values.push(input.baseUnit);
    }
    if (input.packSize !== undefined) {
      fields.push(`pack_size = $${idx++}`);
      values.push(input.packSize);
    }
    if (input.unitsPerPack !== undefined) {
      fields.push(`units_per_pack = $${idx++}`);
      values.push(input.unitsPerPack);
    }
    if (input.purchaseUnit !== undefined) {
      fields.push(`purchase_unit = $${idx++}`);
      values.push(input.purchaseUnit);
    }
    if (input.sellingUnit !== undefined) {
      fields.push(`selling_unit = $${idx++}`);
      values.push(input.sellingUnit);
    }
    if (input.purchaseCost !== undefined) {
      fields.push(`purchase_cost = $${idx++}`);
      values.push(input.purchaseCost);
    }
    if (input.price !== undefined) {
      fields.push(`price = $${idx++}`);
      values.push(input.price);
    }
    if (input.minStockThreshold !== undefined) {
      fields.push(`min_stock_threshold = $${idx++}`);
      values.push(input.minStockThreshold);
    }
    if (input.reorderQuantity !== undefined) {
      fields.push(`reorder_quantity = $${idx++}`);
      values.push(input.reorderQuantity);
    }
    if (input.taxRate !== undefined) {
      fields.push(`tax_rate = $${idx++}`);
      values.push(input.taxRate);
    }
    if (input.isTaxInclusive !== undefined) {
      fields.push(`is_tax_inclusive = $${idx++}`);
      values.push(input.isTaxInclusive);
    }
    if (input.minSellingPrice !== undefined) {
      fields.push(`min_selling_price = $${idx++}`);
      values.push(input.minSellingPrice);
    }
    if (input.trackInventory !== undefined) {
      fields.push(`track_inventory = $${idx++}`);
      values.push(input.trackInventory);
    }
    if (input.trackBatches !== undefined) {
      fields.push(`track_batches = $${idx++}`);
      values.push(input.trackBatches);
    }
    if (input.storageTemperature !== undefined) {
      fields.push(`storage_temperature = $${idx++}`);
      values.push(input.storageTemperature);
    }
    if (input.shelfLifeDays !== undefined) {
      fields.push(`shelf_life_days = $${idx++}`);
      values.push(input.shelfLifeDays);
    }
    if (input.fatPercentage !== undefined) {
      fields.push(`fat_percentage = $${idx++}`);
      values.push(input.fatPercentage);
    }
    if (input.snfPercentage !== undefined) {
      fields.push(`snf_percentage = $${idx++}`);
      values.push(input.snfPercentage);
    }
    if (input.fssaiLicense !== undefined) {
      fields.push(`fssai_license = $${idx++}`);
      values.push(input.fssaiLicense);
    }

    if (fields.length === 0) {
      return this.getProductById(id, client);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;

    const res = await queryRunner.query(sql, values);
    if (res.rows.length === 0) return null;
    return this.getProductById(id, client);
  },

  async updateProductStatus(id: string, isActive: boolean, client?: PoolClient): Promise<Product | null> {
    const queryRunner = client || dbPool;
    const sql = `
      UPDATE products
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id;
    `;
    const res = await queryRunner.query(sql, [isActive, id]);
    if (res.rows.length === 0) return null;
    return this.getProductById(id, client);
  },

  async updateProductStock(id: string, newStock: number, client?: PoolClient): Promise<void> {
    const queryRunner = client || dbPool;
    await queryRunner.query(
      `UPDATE products
       SET stock_quantity = $1, updated_at = NOW()
       WHERE id = $2;`,
      [newStock, id]
    );
  },

  async getProductSummaryStats(): Promise<ProductSummaryStats> {
    const sql = `
      SELECT
        COUNT(*)::text AS total_products,
        COUNT(*) FILTER (WHERE is_active = true)::text AS active_products,
        COUNT(*) FILTER (WHERE stock_quantity <= min_stock_threshold AND stock_quantity > 0)::text AS low_stock_items,
        COUNT(*) FILTER (WHERE stock_quantity = 0)::text AS out_of_stock_items,
        COUNT(DISTINCT p.id) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM inventory_batches b 
            WHERE b.product_id = p.id 
              AND b.status = 'ACTIVE' 
              AND b.quantity_remaining > 0
              AND b.expiry_date >= CURRENT_DATE 
              AND b.expiry_date <= (CURRENT_DATE + INTERVAL '7 days')
          )
        )::text AS expiring_soon_items
      FROM products p
      WHERE p.deleted_at IS NULL;
    `;

    const res = await dbPool.query(sql);
    const row = res.rows[0] || {};

    return {
      totalProducts: parseInt(row.total_products || '0', 10),
      activeProducts: parseInt(row.active_products || '0', 10),
      lowStockItems: parseInt(row.low_stock_items || '0', 10),
      outOfStockItems: parseInt(row.out_of_stock_items || '0', 10),
      expiringSoonItems: parseInt(row.expiring_soon_items || '0', 10),
    };
  },

  async checkDependencies(id: string): Promise<{
    hasStock: boolean;
    stockQuantity: number;
    openOrdersCount: number;
    historicalOrdersCount: number;
    movementsCount: number;
    batchesCount: number;
    canPhysicalDelete: boolean;
  }> {
    const stockRes = await dbPool.query('SELECT stock_quantity FROM products WHERE id = $1', [id]);
    const stockQuantity = Number(stockRes.rows[0]?.stock_quantity || 0);

    // Open/active orders check
    const openOrdersRes = await dbPool.query(
      `SELECT COUNT(*)::text as count
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = $1 AND o.status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT')`,
      [id]
    );
    const openOrdersCount = parseInt(openOrdersRes.rows[0]?.count || '0', 10);

    // Historical orders check
    const histOrdersRes = await dbPool.query(
      `SELECT COUNT(*)::text as count FROM order_items WHERE product_id = $1`,
      [id]
    );
    const historicalOrdersCount = parseInt(histOrdersRes.rows[0]?.count || '0', 10);

    // Movements check
    const movementsRes = await dbPool.query(
      `SELECT COUNT(*)::text as count FROM inventory_movements WHERE product_id = $1`,
      [id]
    );
    const movementsCount = parseInt(movementsRes.rows[0]?.count || '0', 10);

    // Batches check
    const batchesRes = await dbPool.query(
      `SELECT COUNT(*)::text as count FROM inventory_batches WHERE product_id = $1`,
      [id]
    );
    const batchesCount = parseInt(batchesRes.rows[0]?.count || '0', 10);

    // Safe physical deletion only when 0 historical references exist
    const canPhysicalDelete = historicalOrdersCount === 0 && movementsCount === 0 && batchesCount === 0;

    return {
      hasStock: stockQuantity > 0,
      stockQuantity,
      openOrdersCount,
      historicalOrdersCount,
      movementsCount,
      batchesCount,
      canPhysicalDelete,
    };
  },

  async deleteProduct(id: string, actorId?: string, reason?: string): Promise<{ softDeleted: boolean }> {
    const deps = await this.checkDependencies(id);
    if (deps.canPhysicalDelete) {
      await dbPool.query('DELETE FROM products WHERE id = $1', [id]);
      return { softDeleted: false };
    } else {
      await dbPool.query(
        `UPDATE products
         SET deleted_at = NOW(),
             deleted_by = $2,
             deletion_reason = $3,
             is_active = false
         WHERE id = $1`,
        [id, actorId || null, reason || 'Archived via administrative deactivation-first deletion']
      );
      return { softDeleted: true };
    }
  },
};
