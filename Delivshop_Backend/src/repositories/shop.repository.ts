import { dbPool, query } from '../config/database.js';
import {
  CreateShopInput,
  ShopFilterParams,
  ShopRecord,
  ShopStatus,
  UpdateShopInput,
} from '../types/shop.types.js';
import { generateShopId } from '../services/shop-id.service.js';

export const shopRepository = {
  /**
   * Atomically create shop, shop owner user, and shop account inside a transaction.
   * If any step fails, the entire transaction (including the counter increment) is safely rolled back.
   */
  async createWithAccount(
    input: CreateShopInput,
    passwordHash: string
  ): Promise<{ shop: ShopRecord; shopId: string; temporaryPassword: string }> {
    const client = await dbPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Atomically generate the next Shop ID (YYYYMMDDNNN)
      const { shopId } = await generateShopId(client);

      // Generate a canonical email if not supplied (e.g., shop20261014001@merchant.delivshop.internal)
      const email = input.email && input.email.trim()
        ? input.email.toLowerCase().trim()
        : `shop.${shopId}@merchant.delivshop.internal`;

      // 2. Create the associated user account with role 'SHOP'
      const userRes = await client.query(
        `INSERT INTO users (email, password_hash, name, role, phone, is_active)
         VALUES ($1, $2, $3, 'SHOP', $4, $5)
         RETURNING id`,
        [email, passwordHash, input.ownerName, input.phone, input.status !== 'INACTIVE']
      );
      const ownerId = userRes.rows[0].id;

      // 3. Create the Shop record
      const isVerified = Boolean(
        input.latitude !== undefined &&
        input.latitude !== null &&
        input.longitude !== undefined &&
        input.longitude !== null
      );

      const shopRes = await client.query<ShopRecord>(
        `INSERT INTO shops (
          shop_id, name, shop_type, owner_id, owner_name, email, phone,
          address, area, landmark, city, state, pincode,
          latitude, longitude, map_link, is_location_verified,
          delivery_contact_name, delivery_contact_phone, delivery_instructions, delivery_window,
          gstin, billing_address, payment_terms, credit_limit, outstanding_balance,
          notes, status, is_open
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17,
          $18, $19, $20, $21,
          $22, $23, $24, $25, 0.00,
          $26, $27, TRUE
        ) RETURNING *`,
        [
          shopId,
          input.name,
          input.shopType,
          ownerId,
          input.ownerName,
          email,
          input.phone,
          input.address,
          input.area,
          input.landmark || null,
          input.city || 'Nashik',
          input.state || 'Maharashtra',
          input.pincode,
          input.latitude ?? null,
          input.longitude ?? null,
          input.mapLink || null,
          isVerified,
          input.deliveryContactName || null,
          input.deliveryContactPhone || null,
          input.deliveryInstructions || null,
          input.deliveryWindow || null,
          input.gstin || null,
          input.billingAddress || null,
          input.paymentTerms,
          input.creditLimit ?? 0.0,
          input.notes || null,
          input.status || 'ACTIVE',
        ]
      );
      const shop = shopRes.rows[0];

      // 4. Create the shop security account record
      await client.query(
        `INSERT INTO shop_accounts (
          shop_id, user_id, must_change_password, temp_password_issued_at
        ) VALUES ($1, $2, TRUE, NOW())`,
        [shop.id, ownerId]
      );

      await client.query('COMMIT');

      return {
        shop,
        shopId,
        temporaryPassword: '', // Will be assigned by service layer
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Find shop by internal UUID or unique Shop ID (YYYYMMDDNNN).
   */
  async findByIdOrShopId(identifier: string): Promise<ShopRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const sql = isUuid
      ? 'SELECT * FROM shops WHERE id = $1 AND deleted_at IS NULL LIMIT 1'
      : 'SELECT * FROM shops WHERE shop_id = $1 AND deleted_at IS NULL LIMIT 1';

    const res = await query<ShopRecord>(sql, [identifier]);
    return res.rows[0] || null;
  },

  async findByOwnerId(ownerId: string): Promise<ShopRecord | null> {
    const res = await query<ShopRecord>(
      'SELECT * FROM shops WHERE owner_id = $1 LIMIT 1',
      [ownerId]
    );
    return res.rows[0] || null;
  },

  /**
   * List shops with pagination, multi-field search, filters, and sorting.
   */
  async findAll(params: ShopFilterParams): Promise<{
    items: ShopRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 10));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let idx = 1;

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(
        `(name ILIKE $${idx} OR shop_id ILIKE $${idx} OR phone ILIKE $${idx} OR owner_name ILIKE $${idx} OR area ILIKE $${idx})`
      );
      values.push(term);
      idx++;
    }

    if (params.shopType) {
      conditions.push(`shop_type = $${idx}`);
      values.push(params.shopType);
      idx++;
    }

    if (params.status) {
      conditions.push(`status = $${idx}`);
      values.push(params.status);
      idx++;
    }

    if (params.city) {
      conditions.push(`city ILIKE $${idx}`);
      values.push(params.city);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns
    const allowedSortColumns: Record<string, string> = {
      created_at: 'created_at',
      name: 'name',
      shop_id: 'shop_id',
      outstanding_balance: 'outstanding_balance',
      credit_limit: 'credit_limit',
    };
    const sortCol = allowedSortColumns[params.sortBy || 'created_at'] || 'created_at';
    const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // Count total
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM shops ${whereClause}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // Query items
    const querySql = `
      SELECT * FROM shops
      ${whereClause}
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const itemsRes = await query<ShopRecord>(querySql, [...values, limit, offset]);

    return {
      items: itemsRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Update shop details.
   */
  async update(id: string, input: UpdateShopInput): Promise<ShopRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(input.name);
    }
    if (input.shopType !== undefined) {
      fields.push(`shop_type = $${idx++}`);
      values.push(input.shopType);
    }
    if (input.ownerName !== undefined) {
      fields.push(`owner_name = $${idx++}`);
      values.push(input.ownerName);
    }
    if (input.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(input.phone);
    }
    if (input.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(input.email);
    }
    if (input.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(input.address);
    }
    if (input.area !== undefined) {
      fields.push(`area = $${idx++}`);
      values.push(input.area);
    }
    if (input.landmark !== undefined) {
      fields.push(`landmark = $${idx++}`);
      values.push(input.landmark);
    }
    if (input.city !== undefined) {
      fields.push(`city = $${idx++}`);
      values.push(input.city);
    }
    if (input.state !== undefined) {
      fields.push(`state = $${idx++}`);
      values.push(input.state);
    }
    if (input.pincode !== undefined) {
      fields.push(`pincode = $${idx++}`);
      values.push(input.pincode);
    }
    if (input.latitude !== undefined) {
      fields.push(`latitude = $${idx++}`);
      values.push(input.latitude);
    }
    if (input.longitude !== undefined) {
      fields.push(`longitude = $${idx++}`);
      values.push(input.longitude);
      const isVerified = input.latitude !== null && input.longitude !== null;
      fields.push(`is_location_verified = $${idx++}`);
      values.push(isVerified);
    }
    if (input.mapLink !== undefined) {
      fields.push(`map_link = $${idx++}`);
      values.push(input.mapLink);
    }
    if (input.deliveryContactName !== undefined) {
      fields.push(`delivery_contact_name = $${idx++}`);
      values.push(input.deliveryContactName);
    }
    if (input.deliveryContactPhone !== undefined) {
      fields.push(`delivery_contact_phone = $${idx++}`);
      values.push(input.deliveryContactPhone);
    }
    if (input.deliveryInstructions !== undefined) {
      fields.push(`delivery_instructions = $${idx++}`);
      values.push(input.deliveryInstructions);
    }
    if (input.deliveryWindow !== undefined) {
      fields.push(`delivery_window = $${idx++}`);
      values.push(input.deliveryWindow);
    }
    if (input.gstin !== undefined) {
      fields.push(`gstin = $${idx++}`);
      values.push(input.gstin);
    }
    if (input.billingAddress !== undefined) {
      fields.push(`billing_address = $${idx++}`);
      values.push(input.billingAddress);
    }
    if (input.paymentTerms !== undefined) {
      fields.push(`payment_terms = $${idx++}`);
      values.push(input.paymentTerms);
    }
    if (input.creditLimit !== undefined) {
      fields.push(`credit_limit = $${idx++}`);
      values.push(input.creditLimit);
    }
    if (input.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(input.notes);
    }
    if (input.isOpen !== undefined) {
      fields.push(`is_open = $${idx++}`);
      values.push(input.isOpen);
    }

    if (fields.length === 0) {
      return this.findByIdOrShopId(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const idCol = isUuid ? 'id' : 'shop_id';

    const res = await query<ShopRecord>(
      `UPDATE shops SET ${fields.join(', ')} WHERE ${idCol} = $${idx} RETURNING *`,
      values
    );
    return res.rows[0] || null;
  },

  /**
   * Activate or deactivate shop, synchronizing the owner's active status.
   */
  async updateStatus(id: string, status: ShopStatus): Promise<ShopRecord | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    const idCol = isUuid ? 'id' : 'shop_id';

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const shopRes = await client.query<ShopRecord>(
        `UPDATE shops SET status = $1, updated_at = NOW() WHERE ${idCol} = $2 RETURNING *`,
        [status, id]
      );

      if (shopRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const shop = shopRes.rows[0];
      const isActive = status === 'ACTIVE';

      // Update user account is_active
      await client.query(
        'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [isActive, shop.owner_id]
      );

      await client.query('COMMIT');
      return shop;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Reissue temporary credentials for a shop.
   */
  async reissueCredentials(shopId: string, newPasswordHash: string): Promise<boolean> {
    const shop = await this.findByIdOrShopId(shopId);
    if (!shop) return false;

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newPasswordHash, shop.owner_id]
      );

      await client.query(
        `UPDATE shop_accounts 
         SET must_change_password = TRUE, 
             temp_password_issued_at = NOW(), 
             failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = NOW()
         WHERE shop_id = $1`,
        [shop.id]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Find shop account record and associated user.
   */
  async getShopAccount(shopUuid: string): Promise<any | null> {
    const res = await query(
      `SELECT sa.*, u.email as user_email, u.password_hash, u.is_active as user_active
       FROM shop_accounts sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.shop_id = $1 LIMIT 1`,
      [shopUuid]
    );
    return res.rows[0] || null;
  },

  /**
   * Complete password setup after first login.
   */
  async completePasswordSetup(userId: string, newPasswordHash: string): Promise<boolean> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, userId]
      );

      await client.query(
        `UPDATE shop_accounts 
         SET must_change_password = FALSE, 
             failed_login_attempts = 0, 
             locked_until = NULL, 
             last_login_at = NOW(), 
             updated_at = NOW() 
         WHERE user_id = $1`,
        [userId]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getInvoices(shopId: string): Promise<any[]> {
    const shop = await this.findByIdOrShopId(shopId);
    if (!shop) return [];
    const res = await query(
      `SELECT * FROM invoices WHERE shop_id = $1 ORDER BY created_at DESC`,
      [shop.id]
    );
    return res.rows;
  },

  async getPayments(shopId: string): Promise<any[]> {
    const shop = await this.findByIdOrShopId(shopId);
    if (!shop) return [];
    const res = await query(
      `SELECT * FROM payments WHERE shop_id = $1 ORDER BY created_at DESC`,
      [shop.id]
    );
    return res.rows;
  },

  async getDeliveries(shopId: string): Promise<any[]> {
    const shop = await this.findByIdOrShopId(shopId);
    if (!shop) return [];
    const res = await query(
      `SELECT d.*, o.order_number, u.name as driver_name, u.phone as driver_phone
       FROM deliveries d
       JOIN orders o ON d.order_id = o.id
       LEFT JOIN users u ON d.driver_id = u.id
       WHERE o.shop_id = $1
       ORDER BY d.created_at DESC`,
      [shop.id]
    );
    return res.rows;
  },

  async listProducts(shopId: string): Promise<any[]> {
    const shop = await this.findByIdOrShopId(shopId);
    let res = await query(
      'SELECT * FROM products WHERE shop_id = $1 AND is_active = true AND deleted_at IS NULL ORDER BY name ASC',
      [shop ? shop.id : shopId]
    );
    if (res.rowCount === 0) {
      // Fallback to central dairy replenishment catalog
      res = await query(
        'SELECT * FROM products WHERE is_active = true AND deleted_at IS NULL ORDER BY name ASC'
      );
    }
    return res.rows;
  },

  async checkDependencies(shopId: string): Promise<{
    openOrdersCount: number;
    historicalOrdersCount: number;
    activeRunStopsCount: number;
    routeStopsCount: number;
    runStopsCount: number;
    invoicesCount: number;
    paymentsCount: number;
    collectionsCount: number;
    hasOutstandingBalance: boolean;
    outstandingBalance: number;
    hasHistoricalRecords: boolean;
    canPhysicalDelete: boolean;
  }> {
    const shop = await this.findByIdOrShopId(shopId);
    if (!shop) {
      return {
        openOrdersCount: 0,
        historicalOrdersCount: 0,
        activeRunStopsCount: 0,
        routeStopsCount: 0,
        runStopsCount: 0,
        invoicesCount: 0,
        paymentsCount: 0,
        collectionsCount: 0,
        hasOutstandingBalance: false,
        outstandingBalance: 0,
        hasHistoricalRecords: false,
        canPhysicalDelete: false,
      };
    }

    const openOrdersRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM orders
       WHERE shop_id = $1 AND status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT')`,
      [shop.id]
    );
    const histOrdersRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM orders WHERE shop_id = $1`,
      [shop.id]
    );
    const activeRunStopsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_run_stops rs
       JOIN delivery_runs r ON rs.run_id = r.id
       WHERE rs.shop_id = $1 AND r.status IN ('ASSIGNED', 'IN_PROGRESS', 'STARTED', 'ACTIVE')`,
      [shop.id]
    );
    const routeStopsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM route_stops WHERE shop_id = $1`,
      [shop.id]
    );
    const runStopsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_run_stops WHERE shop_id = $1`,
      [shop.id]
    );
    const invoicesRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM invoices WHERE shop_id = $1`,
      [shop.id]
    );
    const paymentsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM payments WHERE shop_id = $1`,
      [shop.id]
    );
    const collectionsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_collections WHERE shop_id = $1`,
      [shop.id]
    );

    const balance = Number(shop.outstanding_balance || 0);
    const openOrdersCount = parseInt(openOrdersRes.rows[0]?.count || '0', 10);
    const historicalOrdersCount = parseInt(histOrdersRes.rows[0]?.count || '0', 10);
    const activeRunStopsCount = parseInt(activeRunStopsRes.rows[0]?.count || '0', 10);
    const routeStopsCount = parseInt(routeStopsRes.rows[0]?.count || '0', 10);
    const runStopsCount = parseInt(runStopsRes.rows[0]?.count || '0', 10);
    const invoicesCount = parseInt(invoicesRes.rows[0]?.count || '0', 10);
    const paymentsCount = parseInt(paymentsRes.rows[0]?.count || '0', 10);
    const collectionsCount = parseInt(collectionsRes.rows[0]?.count || '0', 10);

    const hasHistoricalRecords =
      historicalOrdersCount > 0 ||
      routeStopsCount > 0 ||
      runStopsCount > 0 ||
      invoicesCount > 0 ||
      paymentsCount > 0 ||
      collectionsCount > 0;

    const canPhysicalDelete =
      !hasHistoricalRecords &&
      openOrdersCount === 0 &&
      activeRunStopsCount === 0 &&
      balance <= 0;

    return {
      openOrdersCount,
      historicalOrdersCount,
      activeRunStopsCount,
      routeStopsCount,
      runStopsCount,
      invoicesCount,
      paymentsCount,
      collectionsCount,
      hasOutstandingBalance: balance > 0,
      outstandingBalance: balance,
      hasHistoricalRecords,
      canPhysicalDelete,
    };
  },

  async deleteShop(shopId: string, actorId?: string, reason?: string): Promise<{ softDeleted: boolean }> {
    const shop = await this.findByIdOrShopId(shopId);
    if (!shop) return { softDeleted: false };

    const deps = await this.checkDependencies(shop.id);

    if (deps.canPhysicalDelete) {
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM shop_documents WHERE shop_id = $1', [shop.id]);
        await client.query('DELETE FROM shop_accounts WHERE shop_id = $1', [shop.id]);
        await client.query('DELETE FROM products WHERE shop_id = $1', [shop.id]);
        await client.query('DELETE FROM shops WHERE id = $1', [shop.id]);
        await client.query('COMMIT');
        return { softDeleted: false };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      // Safe archival / soft delete: Preserve all historical transactions & foreign keys
      const client = await dbPool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE shops
           SET deleted_at = NOW(),
               deleted_by = $2,
               deletion_reason = $3,
               status = 'INACTIVE',
               is_open = false,
               updated_at = NOW()
           WHERE id = $1`,
          [shop.id, actorId || null, reason || 'Archived via administrative deactivation-first deletion']
        );
        // Deactivate owner user login account
        if (shop.owner_id) {
          await client.query(
            `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
            [shop.owner_id]
          );
        }
        await client.query('COMMIT');
        return { softDeleted: true };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  },
};
