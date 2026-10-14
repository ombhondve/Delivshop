import { query } from '../config/database.js';

export const deliveryRepository = {
  async findById(deliveryId: string): Promise<any | null> {
    const res = await query(
      `SELECT d.*, o.order_number, s.name as shop_name, s.address as shop_address 
       FROM deliveries d 
       JOIN orders o ON d.order_id = o.id 
       JOIN shops s ON o.shop_id = s.id 
       WHERE d.id = $1 LIMIT 1`,
      [deliveryId]
    );
    return res.rows[0] || null;
  },

  async findAssignedToDriver(driverId: string): Promise<any[]> {
    const res = await query(
      `SELECT d.*, o.order_number, s.name as shop_name, s.address as shop_address 
       FROM deliveries d 
       JOIN orders o ON d.order_id = o.id 
       JOIN shops s ON o.shop_id = s.id 
       WHERE d.driver_id = $1 
       ORDER BY d.created_at DESC`,
      [driverId]
    );
    return res.rows;
  },

  async updateStatus(
    deliveryId: string,
    status: string,
    lat?: number,
    lng?: number,
    notes?: string
  ): Promise<any> {
    const res = await query(
      `UPDATE deliveries 
       SET status = $1, 
           current_latitude = COALESCE($2, current_latitude), 
           current_longitude = COALESCE($3, current_longitude), 
           notes = COALESCE($4, notes), 
           updated_at = NOW() 
       WHERE id = $5 
       RETURNING *`,
      [status, lat ?? null, lng ?? null, notes ?? null, deliveryId]
    );
    return res.rows[0];
  },
};
