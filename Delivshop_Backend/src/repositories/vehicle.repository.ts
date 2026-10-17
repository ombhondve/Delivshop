import { query } from '../config/database.js';
import { generateVehicleId } from '../services/vehicle-id.service.js';

export interface VehicleRecord {
  id: string;
  vehicle_code: string;
  registration_number: string;
  make_model: string;
  vehicle_type: string;
  capacity_kg: number;
  capacity_crates: number;
  fuel_type: string;
  is_refrigerated: boolean;
  nickname?: string | null;
  manufacturing_year?: number | null;
  temperature_min_c?: number | null;
  temperature_max_c?: number | null;
  city?: string | null;
  state?: string | null;
  depot: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'UNDER_MAINTENANCE' | 'INACTIVE';
  is_active: boolean;
  current_odometer_km: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  active_run_id?: string | null;
  active_run_code?: string | null;
  active_driver_name?: string | null;
  active_driver_phone?: string | null;
  active_route_name?: string | null;
  expiring_documents_count?: number;
  expired_documents_count?: number;
  total_documents_count?: number;
  compliance_status?: 'COMPLIANT' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_DOCS';
  nearest_expiry_date?: string | null;
  is_dispatch_eligible?: boolean;
}

export interface ListVehiclesResult {
  items: VehicleRecord[];
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export const vehicleRepository = {
  async listAll(params?: {
    search?: string;
    status?: string;
    vehicleType?: string;
    depot?: string;
    city?: string;
    compliance?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  }): Promise<ListVehiclesResult> {
    const whereClauses: string[] = ['v.deleted_at IS NULL'];
    const values: any[] = [];

    if (params?.search && params.search.trim()) {
      const term = `%${params.search.toLowerCase().trim()}%`;
      values.push(term);
      const idx = values.length;
      whereClauses.push(
        `(LOWER(v.registration_number) LIKE $${idx} OR 
          LOWER(v.vehicle_code) LIKE $${idx} OR 
          LOWER(v.make_model) LIKE $${idx} OR 
          LOWER(COALESCE(v.nickname, '')) LIKE $${idx} OR 
          LOWER(v.depot) LIKE $${idx} OR 
          LOWER(COALESCE(v.city, '')) LIKE $${idx} OR 
          EXISTS (
            SELECT 1 FROM delivery_runs dr 
            JOIN users u ON dr.driver_id = u.id 
            WHERE dr.vehicle_id = v.id 
            AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') 
            AND LOWER(u.name) LIKE $${idx}
          ))`
      );
    }

    if (params?.status && params.status !== 'ALL') {
      values.push(params.status);
      whereClauses.push(`v.status = $${values.length}`);
    }

    if (params?.vehicleType && params.vehicleType !== 'ALL') {
      values.push(params.vehicleType);
      whereClauses.push(`v.vehicle_type = $${values.length}`);
    }

    if (params?.depot && params.depot !== 'ALL') {
      values.push(params.depot);
      whereClauses.push(`v.depot = $${values.length}`);
    }

    if (params?.city && params.city !== 'ALL') {
      values.push(params.city);
      whereClauses.push(`v.city = $${values.length}`);
    }

    // Compliance filtering
    if (params?.compliance && params.compliance !== 'ALL') {
      if (params.compliance === 'EXPIRED') {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM vehicle_documents vd 
          WHERE vd.vehicle_id = v.id 
          AND (vd.expiry_date < CURRENT_DATE OR vd.verification_status = 'EXPIRED')
        )`);
      } else if (params.compliance === 'EXPIRING_SOON') {
        whereClauses.push(`EXISTS (
          SELECT 1 FROM vehicle_documents vd 
          WHERE vd.vehicle_id = v.id 
          AND vd.expiry_date >= CURRENT_DATE 
          AND vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        )`);
      } else if (params.compliance === 'ATTENTION_REQUIRED') {
        whereClauses.push(`(
          v.status = 'UNDER_MAINTENANCE' OR 
          v.is_active = FALSE OR 
          v.status = 'INACTIVE' OR 
          EXISTS (
            SELECT 1 FROM vehicle_documents vd 
            WHERE vd.vehicle_id = v.id 
            AND (vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR vd.verification_status IN ('EXPIRED', 'EXPIRING', 'PENDING', 'REJECTED'))
          ) OR NOT EXISTS (
            SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'RC'
          ) OR NOT EXISTS (
            SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'INSURANCE'
          )
        )`);
      } else if (params.compliance === 'MISSING_DOCS') {
        whereClauses.push(`(
          NOT EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'RC') OR
          NOT EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'INSURANCE')
        )`);
      } else if (params.compliance === 'COMPLIANT') {
        whereClauses.push(`(
          v.is_active = TRUE AND 
          v.status != 'INACTIVE' AND 
          EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'RC' AND (vd.expiry_date IS NULL OR vd.expiry_date > CURRENT_DATE + INTERVAL '30 days') AND vd.verification_status = 'VALID') AND
          EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'INSURANCE' AND (vd.expiry_date IS NULL OR vd.expiry_date > CURRENT_DATE + INTERVAL '30 days') AND vd.verification_status = 'VALID') AND
          NOT EXISTS (SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND (vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR vd.verification_status IN ('EXPIRED', 'REJECTED')))
        )`);
      }
    }

    let sortCol = 'v.registration_number';
    if (params?.sortBy === 'vehicle_code') sortCol = 'v.vehicle_code';
    else if (params?.sortBy === 'created_at') sortCol = 'v.created_at';
    else if (params?.sortBy === 'capacity_kg') sortCol = 'v.capacity_kg';
    else if (params?.sortBy === 'capacity_crates') sortCol = 'v.capacity_crates';
    else if (params?.sortBy === 'status') sortCol = 'v.status';
    else if (params?.sortBy === 'depot') sortCol = 'v.depot';
    else if (params?.sortBy === 'current_odometer_km') sortCol = 'v.current_odometer_km';

    const orderDir = params?.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    // Count query for pagination
    const countSql = `
      SELECT COUNT(*)::int as total
      FROM vehicles v
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countRes = await query(countSql, values);
    const total = countRes.rows[0]?.total || 0;

    let paginationClause = '';
    const page = params?.page && params.page > 0 ? Number(params.page) : undefined;
    const limit = params?.limit && params.limit > 0 ? Number(params.limit) : undefined;

    if (page && limit) {
      const offset = (page - 1) * limit;
      values.push(limit);
      values.push(offset);
      paginationClause = `LIMIT $${values.length - 1} OFFSET $${values.length}`;
    }

    const sql = `
      SELECT v.*,
             (SELECT dr.id FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_id,
             (SELECT dr.run_code FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_code,
             (SELECT u.name FROM delivery_runs dr JOIN users u ON dr.driver_id = u.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_driver_name,
             (SELECT u.phone FROM delivery_runs dr JOIN users u ON dr.driver_id = u.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_driver_phone,
             (SELECT r.name FROM delivery_runs dr JOIN routes r ON dr.route_id = r.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_route_name,
             (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expiry_date >= CURRENT_DATE AND vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_documents_count,
             (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND (vd.expiry_date < CURRENT_DATE OR vd.verification_status = 'EXPIRED')) as expired_documents_count,
             (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id) as total_documents_count,
             (SELECT MIN(vd.expiry_date)::text FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expiry_date >= CURRENT_DATE) as nearest_expiry_date
      FROM vehicles v
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortCol} ${orderDir}
      ${paginationClause}
    `;

    const res = await query(sql, values);
    const items = res.rows.map((row: any) => {
      const isExpired = (row.expired_documents_count || 0) > 0;
      const isExpiring = (row.expiring_documents_count || 0) > 0;
      const hasMissingMandatory = (row.total_documents_count || 0) < 2; // Needs at least RC and Insurance
      let compStatus: 'COMPLIANT' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_DOCS' = 'COMPLIANT';

      if (isExpired) compStatus = 'EXPIRED';
      else if (isExpiring) compStatus = 'EXPIRING_SOON';
      else if (hasMissingMandatory) compStatus = 'MISSING_DOCS';

      const isDispatchEligible =
        row.is_active &&
        row.status === 'AVAILABLE' &&
        !row.active_run_id &&
        !isExpired;

      return {
        ...row,
        compliance_status: compStatus,
        is_dispatch_eligible: isDispatchEligible,
      };
    });

    const totalPages = limit ? Math.ceil(total / limit) : 1;

    return {
      items,
      total,
      page: page || 1,
      limit: limit || total,
      totalPages,
    };
  },

  async getSummary(): Promise<{
    totalVehicles: number;
    activeVehicles: number;
    availableVehicles: number;
    assignedVehicles: number;
    underMaintenanceVehicles: number;
    inactiveVehicles: number;
    attentionRequired: number;
    depots: string[];
    vehicleTypes: string[];
  }> {
    const res = await query(`
      SELECT
        COUNT(*)::int as total_vehicles,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int as active_vehicles,
        COUNT(CASE WHEN is_active = TRUE AND status = 'AVAILABLE' AND NOT EXISTS (
          SELECT 1 FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')
        ) THEN 1 END)::int as available_vehicles,
        COUNT(CASE WHEN is_active = TRUE AND (status = 'ASSIGNED' OR EXISTS (
          SELECT 1 FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')
        )) THEN 1 END)::int as assigned_vehicles,
        COUNT(CASE WHEN status = 'UNDER_MAINTENANCE' THEN 1 END)::int as under_maintenance_vehicles,
        COUNT(CASE WHEN is_active = FALSE OR status = 'INACTIVE' THEN 1 END)::int as inactive_vehicles,
        COUNT(CASE WHEN 
          status = 'UNDER_MAINTENANCE' OR 
          is_active = FALSE OR 
          status = 'INACTIVE' OR 
          EXISTS (
            SELECT 1 FROM vehicle_documents vd 
            WHERE vd.vehicle_id = v.id 
            AND (vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR vd.verification_status IN ('EXPIRED', 'EXPIRING', 'PENDING', 'REJECTED'))
          ) OR NOT EXISTS (
            SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'RC'
          ) OR NOT EXISTS (
            SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.document_type = 'INSURANCE'
          )
        THEN 1 END)::int as attention_required
      FROM vehicles v
      WHERE v.deleted_at IS NULL
    `);

    // Fetch distinct active depots and vehicle types for filters
    const depotsRes = await query(`
      SELECT DISTINCT depot FROM vehicles WHERE deleted_at IS NULL AND depot IS NOT NULL AND depot != '' ORDER BY depot ASC
    `);
    const typesRes = await query(`
      SELECT DISTINCT vehicle_type FROM vehicles WHERE deleted_at IS NULL AND vehicle_type IS NOT NULL AND vehicle_type != '' ORDER BY vehicle_type ASC
    `);

    const r = res.rows[0] || {};
    return {
      totalVehicles: r.total_vehicles || 0,
      activeVehicles: r.active_vehicles || 0,
      availableVehicles: r.available_vehicles || 0,
      assignedVehicles: r.assigned_vehicles || 0,
      underMaintenanceVehicles: r.under_maintenance_vehicles || 0,
      inactiveVehicles: r.inactive_vehicles || 0,
      attentionRequired: r.attention_required || 0,
      depots: depotsRes.rows.map((row) => row.depot),
      vehicleTypes: typesRes.rows.map((row) => row.vehicle_type),
    };
  },

  async findById(id: string): Promise<VehicleRecord | null> {
    const res = await query(
      `SELECT v.*,
              (SELECT dr.id FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_id,
              (SELECT dr.run_code FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_code,
              (SELECT u.name FROM delivery_runs dr JOIN users u ON dr.driver_id = u.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_driver_name,
              (SELECT u.phone FROM delivery_runs dr JOIN users u ON dr.driver_id = u.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_driver_phone,
              (SELECT r.name FROM delivery_runs dr JOIN routes r ON dr.route_id = r.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_route_name,
              (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expiry_date >= CURRENT_DATE AND vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_documents_count,
              (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND (vd.expiry_date < CURRENT_DATE OR vd.verification_status = 'EXPIRED')) as expired_documents_count,
              (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id) as total_documents_count,
              (SELECT MIN(vd.expiry_date)::text FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND vd.expiry_date >= CURRENT_DATE) as nearest_expiry_date
       FROM vehicles v
       WHERE v.id = $1 AND v.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );

    if (!res.rows[0]) return null;

    const row = res.rows[0];
    const isExpired = (row.expired_documents_count || 0) > 0;
    const isExpiring = (row.expiring_documents_count || 0) > 0;
    const hasMissingMandatory = (row.total_documents_count || 0) < 2;
    let compStatus: 'COMPLIANT' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_DOCS' = 'COMPLIANT';

    if (isExpired) compStatus = 'EXPIRED';
    else if (isExpiring) compStatus = 'EXPIRING_SOON';
    else if (hasMissingMandatory) compStatus = 'MISSING_DOCS';

    const isDispatchEligible =
      row.is_active &&
      row.status === 'AVAILABLE' &&
      !row.active_run_id &&
      !isExpired;

    return {
      ...row,
      compliance_status: compStatus,
      is_dispatch_eligible: isDispatchEligible,
    };
  },

  async findByRegistration(reg: string): Promise<VehicleRecord | null> {
    const res = await query(
      `SELECT * FROM vehicles WHERE LOWER(registration_number) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [reg.trim()]
    );
    return res.rows[0] || null;
  },

  async create(data: {
    vehicleCode?: string;
    registrationNumber: string;
    makeModel: string;
    vehicleType: string;
    capacityKg?: number;
    capacityCrates?: number;
    fuelType?: string;
    isRefrigerated?: boolean;
    nickname?: string | null;
    manufacturingYear?: number | null;
    temperatureMinC?: number | null;
    temperatureMaxC?: number | null;
    city?: string | null;
    state?: string | null;
    depot?: string;
    status?: string;
    currentOdometerKm?: number;
    notes?: string | null;
  }): Promise<VehicleRecord> {
    const vCode = data.vehicleCode?.trim()
      ? data.vehicleCode.trim().toUpperCase()
      : await generateVehicleId();

    const res = await query(
      `INSERT INTO vehicles (
        vehicle_code, registration_number, make_model, vehicle_type,
        capacity_kg, capacity_crates, fuel_type, is_refrigerated,
        nickname, manufacturing_year, temperature_min_c, temperature_max_c,
        city, state, depot, status, is_active, current_odometer_km, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, TRUE, $17, $18)
       RETURNING *`,
      [
        vCode,
        data.registrationNumber.trim().toUpperCase(),
        data.makeModel.trim(),
        data.vehicleType.trim(),
        data.capacityKg || 1000.0,
        data.capacityCrates || 60,
        data.fuelType || 'DIESEL',
        Boolean(data.isRefrigerated),
        data.nickname || null,
        data.manufacturingYear || null,
        data.temperatureMinC !== undefined ? data.temperatureMinC : null,
        data.temperatureMaxC !== undefined ? data.temperatureMaxC : null,
        data.city || null,
        data.state || null,
        data.depot || 'Pune Central Cold Depot',
        data.status || 'AVAILABLE',
        data.currentOdometerKm || 0,
        data.notes || null,
      ]
    );
    return res.rows[0];
  },

  async update(id: string, data: any): Promise<VehicleRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];

    const fieldMap: Record<string, string> = {
      registrationNumber: 'registration_number',
      registration_number: 'registration_number',
      makeModel: 'make_model',
      make_model: 'make_model',
      vehicleType: 'vehicle_type',
      vehicle_type: 'vehicle_type',
      capacityKg: 'capacity_kg',
      capacity_kg: 'capacity_kg',
      capacityCrates: 'capacity_crates',
      capacity_crates: 'capacity_crates',
      fuelType: 'fuel_type',
      fuel_type: 'fuel_type',
      isRefrigerated: 'is_refrigerated',
      is_refrigerated: 'is_refrigerated',
      nickname: 'nickname',
      manufacturingYear: 'manufacturing_year',
      manufacturing_year: 'manufacturing_year',
      temperatureMinC: 'temperature_min_c',
      temperature_min_c: 'temperature_min_c',
      temperatureMaxC: 'temperature_max_c',
      temperature_max_c: 'temperature_max_c',
      city: 'city',
      state: 'state',
      depot: 'depot',
      status: 'status',
      isActive: 'is_active',
      is_active: 'is_active',
      currentOdometerKm: 'current_odometer_km',
      current_odometer_km: 'current_odometer_km',
      notes: 'notes',
    };

    for (const [key, dbCol] of Object.entries(fieldMap)) {
      if (data[key] !== undefined && !fields.some((f) => f.startsWith(`${dbCol} =`))) {
        let val = data[key];
        if (dbCol === 'registration_number' && typeof val === 'string') {
          val = val.trim().toUpperCase();
        }
        values.push(val);
        fields.push(`${dbCol} = $${values.length}`);
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const res = await query(
      `UPDATE vehicles 
       SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = $${values.length} AND deleted_at IS NULL 
       RETURNING *`,
      values
    );
    return res.rows[0] || null;
  },

  async getDocuments(vehicleId: string): Promise<any[]> {
    const res = await query(
      `SELECT vd.*, u.name as verifier_name
       FROM vehicle_documents vd
       LEFT JOIN users u ON vd.verified_by = u.id
       WHERE vd.vehicle_id = $1
       ORDER BY 
         CASE vd.document_type
           WHEN 'RC' THEN 1
           WHEN 'INSURANCE' THEN 2
           WHEN 'FITNESS' THEN 3
           WHEN 'PUC' THEN 4
           WHEN 'PERMIT' THEN 5
           WHEN 'TEMPERATURE_CALIBRATION' THEN 6
           ELSE 7
         END ASC, vd.created_at ASC`,
      [vehicleId]
    );
    return res.rows;
  },

  async getDocumentById(vehicleId: string, docId: string): Promise<any | null> {
    const res = await query(
      `SELECT vd.*, u.name as verifier_name
       FROM vehicle_documents vd
       LEFT JOIN users u ON vd.verified_by = u.id
       WHERE vd.vehicle_id = $1 AND vd.id = $2
       LIMIT 1`,
      [vehicleId, docId]
    );
    return res.rows[0] || null;
  },

  async upsertDocument(data: {
    vehicleId: string;
    documentType: string;
    documentNumber: string;
    issueDate?: string | null;
    expiryDate?: string | null;
    verificationStatus?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    storagePath?: string | null;
    mimeType?: string | null;
    fileSizeBytes?: number | null;
    verifiedBy?: string | null;
    notes?: string | null;
  }): Promise<any> {
    const res = await query(
      `INSERT INTO vehicle_documents (
        vehicle_id, document_type, document_number, issue_date, expiry_date,
        verification_status, file_url, file_name, storage_path, mime_type, file_size_bytes,
        verified_by, verified_at, notes
       )
       VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12::uuid, CASE WHEN $12::uuid IS NOT NULL THEN NOW() ELSE NULL END, $13)
       ON CONFLICT (vehicle_id, document_type) DO UPDATE
       SET document_number = EXCLUDED.document_number,
           issue_date = EXCLUDED.issue_date,
           expiry_date = EXCLUDED.expiry_date,
           verification_status = EXCLUDED.verification_status,
           file_url = COALESCE(EXCLUDED.file_url, vehicle_documents.file_url),
           file_name = COALESCE(EXCLUDED.file_name, vehicle_documents.file_name),
           storage_path = COALESCE(EXCLUDED.storage_path, vehicle_documents.storage_path),
           mime_type = COALESCE(EXCLUDED.mime_type, vehicle_documents.mime_type),
           file_size_bytes = COALESCE(EXCLUDED.file_size_bytes, vehicle_documents.file_size_bytes),
           verified_by = COALESCE(EXCLUDED.verified_by, vehicle_documents.verified_by),
           verified_at = CASE WHEN EXCLUDED.verified_by IS NOT NULL THEN NOW() ELSE vehicle_documents.verified_at END,
           notes = EXCLUDED.notes,
           updated_at = NOW()
       RETURNING *`,
      [
        data.vehicleId,
        data.documentType,
        data.documentNumber.trim(),
        data.issueDate || null,
        data.expiryDate || null,
        data.verificationStatus || 'VALID',
        data.fileUrl || null,
        data.fileName || null,
        data.storagePath || null,
        data.mimeType || null,
        data.fileSizeBytes || null,
        data.verifiedBy || null,
        data.notes || null,
      ]
    );
    return res.rows[0];
  },

  async deleteDocument(vehicleId: string, docId: string): Promise<any | null> {
    const res = await query(
      `DELETE FROM vehicle_documents WHERE vehicle_id = $1 AND id = $2 RETURNING *`,
      [vehicleId, docId]
    );
    return res.rows[0] || null;
  },

  async getMaintenanceRecords(vehicleId: string): Promise<any[]> {
    const res = await query(
      `SELECT vm.*, u.name as recorder_name
       FROM vehicle_maintenance vm
       LEFT JOIN users u ON vm.recorded_by = u.id
       WHERE vm.vehicle_id = $1
       ORDER BY vm.service_date DESC, vm.created_at DESC`,
      [vehicleId]
    );
    return res.rows;
  },

  async addMaintenanceRecord(data: {
    vehicleId: string;
    serviceDate?: string;
    serviceType: string;
    odometerKm: number;
    cost?: number;
    serviceCenter?: string;
    description?: string;
    nextServiceDate?: string;
    recordedBy?: string;
  }): Promise<any> {
    const res = await query(
      `INSERT INTO vehicle_maintenance (
        vehicle_id, service_date, service_type, odometer_km, cost, service_center, description, next_service_date, recorded_by
       )
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.vehicleId,
        data.serviceDate || null,
        data.serviceType.trim(),
        data.odometerKm,
        data.cost || 0.0,
        data.serviceCenter || null,
        data.description || null,
        data.nextServiceDate || null,
        data.recordedBy || null,
      ]
    );

    // Update vehicle's current odometer if new service has higher odometer reading
    await query(
      `UPDATE vehicles 
       SET current_odometer_km = GREATEST(current_odometer_km, $1), updated_at = NOW() 
       WHERE id = $2`,
      [data.odometerKm, data.vehicleId]
    );

    return res.rows[0];
  },

  async getAssignmentHistory(vehicleId: string): Promise<any[]> {
    const res = await query(
      `SELECT dr.*, 
              r.route_code, r.name as route_name, r.city as route_city, r.depot as route_depot,
              u.name as driver_name, u.employee_id as driver_employee_id, u.phone as driver_phone
       FROM delivery_runs dr
       JOIN routes r ON dr.route_id = r.id
       JOIN users u ON dr.driver_id = u.id
       WHERE dr.vehicle_id = $1
       ORDER BY dr.delivery_date DESC, dr.created_at DESC
       LIMIT 50`,
      [vehicleId]
    );
    return res.rows;
  },

  async getActivityHistory(vehicleId: string): Promise<any[]> {
    const res = await query(
      `SELECT al.id, al.action, al.details, al.created_at, al.ip_address,
              u.name as actor_name, u.role as actor_role, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       WHERE al.entity_type = 'VEHICLE' AND al.entity_id = $1
       ORDER BY al.created_at DESC
       LIMIT 50`,
      [vehicleId]
    );
    return res.rows;
  },

  async checkDispatchEligibility(
    vehicleId: string,
    options?: {
      targetDate?: string;
      requiresRefrigeration?: boolean;
      excludeRunId?: string;
    }
  ): Promise<{
    isEligible: boolean;
    reasons: string[];
    warnings: string[];
    vehicle: VehicleRecord | null;
    conditions: {
      isActive: boolean;
      notInMaintenance: boolean;
      noConflictingAssignment: boolean;
      mandatoryDocumentsValid: boolean;
      refrigerationCompatible: boolean;
    };
  }> {
    const vehicle = await this.findById(vehicleId);
    if (!vehicle) {
      return {
        isEligible: false,
        reasons: ['Vehicle does not exist in the fleet.'],
        warnings: [],
        vehicle: null,
        conditions: {
          isActive: false,
          notInMaintenance: false,
          noConflictingAssignment: false,
          mandatoryDocumentsValid: false,
          refrigerationCompatible: false,
        },
      };
    }

    const reasons: string[] = [];
    const warnings: string[] = [];
    const dateToCheck = options?.targetDate || new Date().toISOString().split('T')[0];

    // 1. Active check
    const isActive = Boolean(vehicle.is_active && vehicle.status !== 'INACTIVE');
    if (!isActive) {
      reasons.push(`Vehicle ${vehicle.registration_number} is marked as INACTIVE or decommissioned.`);
    }

    // 2. Maintenance check
    const notInMaintenance = vehicle.status !== 'UNDER_MAINTENANCE';
    if (!notInMaintenance) {
      reasons.push(`Vehicle ${vehicle.registration_number} is currently undergoing maintenance in workshop.`);
    }

    // 3. Document compliance check
    const docs = await this.getDocuments(vehicleId);
    const docMap = new Map<string, any>();
    docs.forEach((d) => docMap.set(d.document_type, d));

    let mandatoryDocumentsValid = true;

    // RC check
    const rc = docMap.get('RC');
    if (!rc) {
      reasons.push('Vehicle is missing mandatory Registration Certificate (RC).');
      mandatoryDocumentsValid = false;
    } else if (rc.verification_status === 'REJECTED') {
      reasons.push('Vehicle Registration Certificate (RC) was rejected during compliance audit.');
      mandatoryDocumentsValid = false;
    } else if (rc.expiry_date && new Date(rc.expiry_date) < new Date(dateToCheck)) {
      reasons.push(`Vehicle Registration Certificate (RC) expired on ${rc.expiry_date}.`);
      mandatoryDocumentsValid = false;
    }

    // Insurance check
    const ins = docMap.get('INSURANCE');
    if (!ins) {
      reasons.push('Vehicle is missing mandatory Commercial Insurance policy.');
      mandatoryDocumentsValid = false;
    } else if (ins.verification_status === 'REJECTED') {
      reasons.push('Commercial Insurance was rejected during compliance audit.');
      mandatoryDocumentsValid = false;
    } else if (ins.expiry_date && new Date(ins.expiry_date) < new Date(dateToCheck)) {
      reasons.push(`Commercial Insurance expired on ${ins.expiry_date}.`);
      mandatoryDocumentsValid = false;
    } else if (ins.expiry_date) {
      const daysLeft = Math.ceil((new Date(ins.expiry_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
      if (daysLeft <= 15) {
        warnings.push(`Commercial Insurance will expire soon (in ${daysLeft} days).`);
      }
    }

    // PUC check (Warning/Block if expired)
    const puc = docMap.get('PUC');
    if (puc && puc.expiry_date && new Date(puc.expiry_date) < new Date(dateToCheck)) {
      warnings.push(`Pollution Under Control (PUC) certificate expired on ${puc.expiry_date}.`);
    }

    // Fitness certificate check
    const fit = docMap.get('FITNESS');
    if (fit && fit.expiry_date && new Date(fit.expiry_date) < new Date(dateToCheck)) {
      reasons.push(`RTO Commercial Fitness Certificate expired on ${fit.expiry_date}.`);
      mandatoryDocumentsValid = false;
    }

    // 4. Conflicting Assignment Check on target date
    const conflictSql = options?.excludeRunId
      ? `SELECT run_code, status FROM delivery_runs WHERE vehicle_id = $1 AND delivery_date = $2::date AND id != $3 AND status NOT IN ('CANCELLED', 'COMPLETED') LIMIT 1`
      : `SELECT run_code, status FROM delivery_runs WHERE vehicle_id = $1 AND delivery_date = $2::date AND status NOT IN ('CANCELLED', 'COMPLETED') LIMIT 1`;
    const conflictVals = options?.excludeRunId
      ? [vehicleId, dateToCheck, options.excludeRunId]
      : [vehicleId, dateToCheck];

    const conflictRes = await query(conflictSql, conflictVals);
    let noConflictingAssignment = true;
    if (conflictRes.rows[0]) {
      noConflictingAssignment = false;
      reasons.push(
        `Vehicle is already assigned to active delivery run ${conflictRes.rows[0].run_code} on ${dateToCheck} (status: ${conflictRes.rows[0].status}).`
      );
    }

    // 5. Refrigeration capability requirement
    let refrigerationCompatible = true;
    if (options?.requiresRefrigeration && !vehicle.is_refrigerated) {
      refrigerationCompatible = false;
      reasons.push('Requested delivery run requires cold-chain refrigeration, but this vehicle has no chiller unit installed.');
    }

    const isEligible =
      isActive &&
      notInMaintenance &&
      mandatoryDocumentsValid &&
      noConflictingAssignment &&
      refrigerationCompatible;

    return {
      isEligible,
      reasons,
      warnings,
      vehicle,
      conditions: {
        isActive,
        notInMaintenance,
        noConflictingAssignment,
        mandatoryDocumentsValid,
        refrigerationCompatible,
      },
    };
  },

  async checkDependencies(vehicleId: string): Promise<{
    activeRunsCount: number;
    historicalRunsCount: number;
  }> {
    const activeRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_runs WHERE vehicle_id = $1 AND status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')`,
      [vehicleId]
    );
    const histRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_runs WHERE vehicle_id = $1`,
      [vehicleId]
    );
    return {
      activeRunsCount: parseInt(activeRes.rows[0]?.count || '0', 10),
      historicalRunsCount: parseInt(histRes.rows[0]?.count || '0', 10),
    };
  },

  async softDelete(vehicleId: string, actorId?: string, reason?: string): Promise<boolean> {
    await query(
      `UPDATE vehicles
       SET deleted_at = NOW(),
           deleted_by = $2,
           deletion_reason = $3,
           is_active = FALSE,
           status = 'INACTIVE'
       WHERE id = $1`,
      [vehicleId, actorId || null, reason || 'Archived via administrative vehicle deactivation']
    );
    return true;
  },
};
