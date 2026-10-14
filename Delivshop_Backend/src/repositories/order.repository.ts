import { query, dbPool } from '../config/database.js';
import { AppError } from '../utils/errors.js';

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

      // 3. Validate product existence and prices
      const productIds = items.map((i) => i.productId);
      const prodRes = await client.query(
        `SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = ANY($1::uuid[]) AND shop_id = $2`,
        [productIds, shop.id]
      );
      const productMap = new Map(prodRes.rows.map((p) => [p.id, p]));

      let subtotal = 0;
      const validatedItems = items.map((item) => {
        const prod = productMap.get(item.productId);
        if (!prod || !prod.is_active) {
          throw new AppError(`Product is no longer available in the active dairy catalog`, 400);
        }
        const unitPrice = Number(prod.price);
        const lineTotal = unitPrice * item.quantity;
        subtotal += lineTotal;
        return {
          productId: item.productId,
          name: prod.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice: lineTotal,
        };
      });

      const deliveryFee = 0.0;
      const total = subtotal + deliveryFee;

      // Generate human-readable order number: ORD-YYYYMMDD-XXXX
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderNumber = `ORD-${dateStr}-${randomSuffix}`;

      // 4. Insert order
      const orderRes = await client.query(
        `INSERT INTO orders (
          order_number, shop_id, customer_id, status, subtotal, delivery_fee, total, delivery_address, idempotency_key
        ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          orderNumber,
          shop.id,
          userId,
          subtotal,
          deliveryFee,
          total,
          JSON.stringify(deliveryAddress),
          idempotencyKey?.trim() || null,
        ]
      );
      const order = orderRes.rows[0];

      // 5. Insert order line items
      for (const line of validatedItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, line.productId, line.quantity, line.unitPrice, line.totalPrice]
        );
      }

      // 6. Create initial delivery dispatch record
      await client.query(
        `INSERT INTO deliveries (order_id, status, notes)
         VALUES ($1, 'PENDING_ASSIGNMENT', 'Order registered; awaiting vehicle assignment')
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
};
