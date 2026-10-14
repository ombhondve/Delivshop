import { query, dbPool } from '../config/database.js';

export const orderRepository = {
  async findById(orderId: string): Promise<any | null> {
    const res = await query(
      `SELECT o.*, s.name as shop_name 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.id = $1 LIMIT 1`,
      [orderId]
    );
    return res.rows[0] || null;
  },

  async findByShopId(shopId: string): Promise<any[]> {
    const res = await query(
      `SELECT o.*, s.name as shop_name 
       FROM orders o 
       JOIN shops s ON o.shop_id = s.id 
       WHERE o.shop_id = $1 
       ORDER BY o.created_at DESC`,
      [shopId]
    );
    return res.rows;
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
