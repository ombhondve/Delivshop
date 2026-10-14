import { query } from '../config/database.js';

export interface ShopRecord {
  id: string;
  name: string;
  owner_id: string;
  email: string;
  phone: string;
  address: string;
  is_open: boolean;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

export const shopRepository = {
  async findById(id: string): Promise<ShopRecord | null> {
    const res = await query<ShopRecord>(
      'SELECT id, name, owner_id, email, phone, address, is_open, rating, created_at, updated_at FROM shops WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] || null;
  },

  async findByOwnerId(ownerId: string): Promise<ShopRecord | null> {
    const res = await query<ShopRecord>(
      'SELECT id, name, owner_id, email, phone, address, is_open, rating, created_at, updated_at FROM shops WHERE owner_id = $1 LIMIT 1',
      [ownerId]
    );
    return res.rows[0] || null;
  },

  async listProducts(shopId: string): Promise<any[]> {
    const res = await query(
      'SELECT id, shop_id, name, description, sku, price, stock_quantity, category, is_active, created_at FROM products WHERE shop_id = $1 ORDER BY created_at DESC',
      [shopId]
    );
    return res.rows;
  },
};
