import { query } from '../config/database.js';

export const deliveryRepository = {
  async findById(deliveryId: string): Promise<any | null> {
    const res = await query(
      `SELECT d.*, 
              o.order_number, o.total, o.delivery_address,
              s.name as shop_name, s.address as shop_address, s.area as shop_area, s.city as shop_city,
              s.latitude as shop_latitude, s.longitude as shop_longitude, s.is_location_verified,
              s.delivery_contact_name, s.delivery_contact_phone, s.delivery_instructions
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
      `SELECT d.*, 
              o.order_number, o.total, o.delivery_address,
              s.name as shop_name, s.address as shop_address, s.area as shop_area, s.city as shop_city,
              s.latitude as shop_latitude, s.longitude as shop_longitude, s.is_location_verified,
              s.delivery_contact_name, s.delivery_contact_phone, s.delivery_instructions
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
    const isDelivered = status === 'DELIVERED';
    const isPickedUp = status === 'PICKED_UP';

    const res = await query(
      `UPDATE deliveries 
       SET status = $1, 
           current_latitude = COALESCE($2, current_latitude), 
           current_longitude = COALESCE($3, current_longitude), 
           picked_up_at = CASE WHEN $4 = TRUE THEN NOW() ELSE picked_up_at END,
           delivered_at = CASE WHEN $5 = TRUE THEN NOW() ELSE delivered_at END,
           notes = COALESCE($6, notes), 
           updated_at = NOW() 
       WHERE id = $7 
       RETURNING *`,
      [status, lat ?? null, lng ?? null, isPickedUp, isDelivered, notes ?? null, deliveryId]
    );
    return res.rows[0];
  },

  async assignDriverToOrder(orderId: string, driverId: string): Promise<any> {
    // Check if delivery record already exists for order
    const existing = await query(`SELECT id FROM deliveries WHERE order_id = $1 LIMIT 1`, [orderId]);
    if (existing.rowCount && existing.rowCount > 0) {
      const res = await query(
        `UPDATE deliveries 
         SET driver_id = $1, status = 'ASSIGNED', updated_at = NOW() 
         WHERE order_id = $2 
         RETURNING *`,
        [driverId, orderId]
      );
      return res.rows[0];
    } else {
      const res = await query(
        `INSERT INTO deliveries (order_id, driver_id, status)
         VALUES ($1, $2, 'ASSIGNED')
         RETURNING *`,
        [orderId, driverId]
      );
      return res.rows[0];
    }
  },

  async listAvailableDrivers(): Promise<any[]> {
    const res = await query(
      `SELECT id, name, email, phone, role, is_active FROM users 
       WHERE role = 'DRIVER' AND is_active = TRUE 
       ORDER BY name ASC`
    );
    return res.rows;
  },
};
