import { query } from '../config/database.js';
import { UserRecord, UserRole } from '../types/user.types.js';

export const userRepository = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      'SELECT id, email, password_hash, name, role, phone, is_active, created_at, updated_at FROM users WHERE email = $1 LIMIT 1',
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const res = await query<UserRecord>(
      'SELECT id, email, password_hash, name, role, phone, is_active, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return res.rows[0] || null;
  },

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role: UserRole;
    phone?: string;
  }): Promise<UserRecord> {
    const res = await query<UserRecord>(
      `INSERT INTO users (email, password_hash, name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, phone, is_active, created_at, updated_at`,
      [data.email.toLowerCase().trim(), data.passwordHash, data.name, data.role, data.phone || null]
    );
    return res.rows[0];
  },
};
