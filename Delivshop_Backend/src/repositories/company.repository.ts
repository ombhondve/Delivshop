import { dbPool, query } from '../config/database.js';
import {
  CompanyRecord,
  Company,
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyFilterParams,
  CompanySummaryStats,
  CompanyStatus,
} from '../types/company.types.js';

export function toCompanyDTO(row: CompanyRecord, productsCount = 0): Company {
  return {
    id: row.id,
    companyCode: row.company_code,
    name: row.name,
    companyType: row.company_type,
    description: row.description,
    logoUrl: row.logo_url,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    altPhone: row.alt_phone,
    gstin: row.gstin,
    pan: row.pan,
    registrationNumber: row.registration_number,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    productsCount,
  };
}

export const companyRepository = {
  async create(input: CreateCompanyInput & { companyCode: string }, createdBy?: string): Promise<CompanyRecord> {
    // Defensively verify created_by exists in users table to prevent FK constraint failure
    let validCreatedBy: string | null = null;
    if (createdBy) {
      const uRes = await query('SELECT 1 FROM users WHERE id = $1', [createdBy]);
      if ((uRes.rowCount ?? 0) > 0) {
        validCreatedBy = createdBy;
      }
    }

    const res = await query<CompanyRecord>(
      `INSERT INTO companies (
        company_code, name, company_type, description, logo_url,
        contact_person, phone, email, alt_phone,
        gstin, pan, registration_number,
        address_line_1, address_line_2, city, state, postal_code, country,
        status, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21
      ) RETURNING *`,
      [
        input.companyCode,
        input.name,
        input.companyType || 'Dairy Processor',
        input.description || null,
        input.logoUrl || null,
        input.contactPerson,
        input.phone,
        input.email,
        input.altPhone || null,
        input.gstin ? input.gstin.toUpperCase() : null,
        input.pan ? input.pan.toUpperCase() : null,
        input.registrationNumber || null,
        input.addressLine1,
        input.addressLine2 || null,
        input.city || 'Nashik',
        input.state || 'Maharashtra',
        input.postalCode,
        input.country || 'India',
        input.status || 'ACTIVE',
        input.notes || null,
        validCreatedBy,
      ]
    );

    return res.rows[0];
  },

  async findById(id: string): Promise<CompanyRecord | null> {
    const res = await query<CompanyRecord>('SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL', [id]);
    return res.rows[0] || null;
  },

  async findByCompanyCode(companyCode: string): Promise<CompanyRecord | null> {
    const res = await query<CompanyRecord>(
      'SELECT * FROM companies WHERE UPPER(company_code) = UPPER($1) AND deleted_at IS NULL',
      [companyCode.trim()]
    );
    return res.rows[0] || null;
  },

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    const sql = excludeId
      ? 'SELECT 1 FROM companies WHERE LOWER(name) = LOWER($1) AND id != $2'
      : 'SELECT 1 FROM companies WHERE LOWER(name) = LOWER($1)';
    const params = excludeId ? [name.trim(), excludeId] : [name.trim()];
    const res = await query(sql, params);
    return (res.rowCount ?? 0) > 0;
  },

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const sql = excludeId
      ? 'SELECT 1 FROM companies WHERE UPPER(company_code) = UPPER($1) AND id != $2'
      : 'SELECT 1 FROM companies WHERE UPPER(company_code) = UPPER($1)';
    const params = excludeId ? [code.trim(), excludeId] : [code.trim()];
    const res = await query(sql, params);
    return (res.rowCount ?? 0) > 0;
  },

  async getAssociatedProductsCount(companyId: string): Promise<number> {
    const res = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM products WHERE company_id = $1 AND deleted_at IS NULL',
      [companyId]
    );
    return parseInt(res.rows[0]?.count || '0', 10);
  },

  async list(params: CompanyFilterParams): Promise<{
    items: CompanyRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 10));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.search && params.search.trim()) {
      const searchTerm = `%${params.search.trim()}%`;
      whereClauses.push(
        `(name ILIKE $${paramIndex} OR company_code ILIKE $${paramIndex} OR contact_person ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR city ILIKE $${paramIndex})`
      );
      values.push(searchTerm);
      paramIndex++;
    }

    if (params.status) {
      whereClauses.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.companyType) {
      whereClauses.push(`company_type = $${paramIndex}`);
      values.push(params.companyType);
      paramIndex++;
    }

    if (params.city && params.city.trim()) {
      whereClauses.push(`city ILIKE $${paramIndex}`);
      values.push(`%${params.city.trim()}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Sort column allowlist to strictly prevent SQL injection
    const allowedSortColumns: Record<string, string> = {
      created_at: 'created_at',
      name: 'name',
      company_code: 'company_code',
      city: 'city',
      status: 'status',
    };

    const sortBy = allowedSortColumns[params.sortBy || 'created_at'] || 'created_at';
    const sortOrder = params.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    // 1. Get total count
    const countRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM companies ${whereSQL}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    // 2. Query items
    const querySQL = `
      SELECT * FROM companies
      ${whereSQL}
      ORDER BY ${sortBy} ${sortOrder}, id ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const itemsRes = await query<CompanyRecord>(querySQL, [...values, limit, offset]);

    return {
      items: itemsRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async getSummaryStats(): Promise<CompanySummaryStats> {
    const res = await query<{
      total_companies: string;
      active_companies: string;
      inactive_companies: string;
      recent_companies: string;
    }>(`
      SELECT
        COUNT(*)::text AS total_companies,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active_companies,
        COUNT(*) FILTER (WHERE status = 'INACTIVE')::text AS inactive_companies,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::text AS recent_companies
      FROM companies
      WHERE deleted_at IS NULL
    `);

    const row = res.rows[0];
    return {
      totalCompanies: parseInt(row?.total_companies || '0', 10),
      activeCompanies: parseInt(row?.active_companies || '0', 10),
      inactiveCompanies: parseInt(row?.inactive_companies || '0', 10),
      recentCompanies: parseInt(row?.recent_companies || '0', 10),
    };
  },

  async update(id: string, input: UpdateCompanyInput): Promise<CompanyRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const addField = (colName: string, val: any) => {
      if (val !== undefined) {
        fields.push(`${colName} = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }
    };

    addField('name', input.name?.trim());
    addField('company_type', input.companyType);
    addField('description', input.description !== undefined ? (input.description ? input.description.trim() : null) : undefined);
    addField('logo_url', input.logoUrl !== undefined ? (input.logoUrl ? input.logoUrl.trim() : null) : undefined);
    addField('contact_person', input.contactPerson?.trim());
    addField('phone', input.phone?.trim());
    addField('email', input.email?.trim().toLowerCase());
    addField('alt_phone', input.altPhone !== undefined ? (input.altPhone ? input.altPhone.trim() : null) : undefined);
    addField('gstin', input.gstin !== undefined ? (input.gstin ? input.gstin.trim().toUpperCase() : null) : undefined);
    addField('pan', input.pan !== undefined ? (input.pan ? input.pan.trim().toUpperCase() : null) : undefined);
    addField('registration_number', input.registrationNumber !== undefined ? (input.registrationNumber ? input.registrationNumber.trim() : null) : undefined);
    addField('address_line_1', input.addressLine1?.trim());
    addField('address_line_2', input.addressLine2 !== undefined ? (input.addressLine2 ? input.addressLine2.trim() : null) : undefined);
    addField('city', input.city?.trim());
    addField('state', input.state?.trim());
    addField('postal_code', input.postalCode?.trim());
    addField('country', input.country?.trim());
    addField('notes', input.notes !== undefined ? (input.notes ? input.notes.trim() : null) : undefined);
    addField('status', input.status);

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `
      UPDATE companies
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const res = await query<CompanyRecord>(sql, values);
    return res.rows[0] || null;
  },

  async updateStatus(id: string, status: CompanyStatus): Promise<CompanyRecord | null> {
    const res = await query<CompanyRecord>(
      `UPDATE companies
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [status, id]
    );
    return res.rows[0] || null;
  },

  async checkDependencies(id: string): Promise<{
    activeProductsCount: number;
    totalProductsCount: number;
    batchesCount: number;
  }> {
    const activeProductsRes = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM products WHERE company_id = $1 AND deleted_at IS NULL AND is_active = true',
      [id]
    );
    const totalProductsRes = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM products WHERE company_id = $1 AND deleted_at IS NULL',
      [id]
    );
    const batchesRes = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM inventory_batches WHERE company_id = $1',
      [id]
    );

    return {
      activeProductsCount: parseInt(activeProductsRes.rows[0]?.count || '0', 10),
      totalProductsCount: parseInt(totalProductsRes.rows[0]?.count || '0', 10),
      batchesCount: parseInt(batchesRes.rows[0]?.count || '0', 10),
    };
  },

  async deleteCompany(id: string, actorId?: string, reason?: string): Promise<{ softDeleted: boolean }> {
    const deps = await this.checkDependencies(id);
    if (deps.totalProductsCount === 0 && deps.batchesCount === 0) {
      await query('DELETE FROM companies WHERE id = $1', [id]);
      return { softDeleted: false };
    } else {
      await query(
        `UPDATE companies
         SET deleted_at = NOW(),
             deleted_by = $2,
             deletion_reason = $3,
             status = 'INACTIVE'
         WHERE id = $1`,
        [id, actorId || null, reason || 'Archived via administrative deactivation-first deletion']
      );
      return { softDeleted: true };
    }
  },
};
