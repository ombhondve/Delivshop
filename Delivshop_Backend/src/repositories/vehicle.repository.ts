import { query } from '../config/database.js';

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
  city: string;
  state: string;
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
  expiring_documents_count?: number;
}

export const vehicleRepository = {
  async listAll(params?: {
    search?: string;
    status?: string;
    vehicleType?: string;
    city?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<VehicleRecord[]> {
    const whereClauses: string[] = ['v.deleted_at IS NULL'];
    const values: any[] = [];

    if (params?.search) {
      values.push(`%${params.search.toLowerCase().trim()}%`);
      const idx = values.length;
      whereClauses.push(
        `(LOWER(v.registration_number) LIKE $${idx} OR LOWER(v.vehicle_code) LIKE $${idx} OR LOWER(v.make_model) LIKE $${idx} OR LOWER(v.depot) LIKE $${idx} OR LOWER(v.city) LIKE $${idx})`
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

    if (params?.city && params.city !== 'ALL') {
      values.push(params.city);
      whereClauses.push(`v.city = $${values.length}`);
    }

    let sortCol = 'v.registration_number';
    if (params?.sortBy === 'vehicle_code') sortCol = 'v.vehicle_code';
    else if (params?.sortBy === 'created_at') sortCol = 'v.created_at';
    else if (params?.sortBy === 'capacity_kg') sortCol = 'v.capacity_kg';
    else if (params?.sortBy === 'status') sortCol = 'v.status';

    const orderDir = params?.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT v.*,
             (SELECT dr.id FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_id,
             (SELECT dr.run_code FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_code,
             (SELECT u.name FROM delivery_runs dr JOIN users u ON dr.driver_id = u.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_driver_name,
             (SELECT COUNT(*)::int FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND (vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR vd.verification_status IN ('EXPIRED', 'EXPIRING', 'PENDING'))) as expiring_documents_count
      FROM vehicles v
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortCol} ${orderDir}
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  async getSummary(): Promise<{
    totalVehicles: number;
    activeVehicles: number;
    availableVehicles: number;
    assignedVehicles: number;
    underMaintenanceVehicles: number;
    inactiveVehicles: number;
    attentionRequired: number;
  }> {
    const res = await query(`
      SELECT
        COUNT(*)::int as total_vehicles,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END)::int as active_vehicles,
        COUNT(CASE WHEN is_active = TRUE AND status = 'AVAILABLE' THEN 1 END)::int as available_vehicles,
        COUNT(CASE WHEN is_active = TRUE AND status = 'ASSIGNED' THEN 1 END)::int as assigned_vehicles,
        COUNT(CASE WHEN status = 'UNDER_MAINTENANCE' THEN 1 END)::int as under_maintenance_vehicles,
        COUNT(CASE WHEN is_active = FALSE OR status = 'INACTIVE' THEN 1 END)::int as inactive_vehicles,
        COUNT(CASE WHEN status = 'UNDER_MAINTENANCE' OR is_active = FALSE OR EXISTS (
          SELECT 1 FROM vehicle_documents vd WHERE vd.vehicle_id = v.id AND (vd.expiry_date <= CURRENT_DATE + INTERVAL '30 days' OR vd.verification_status = 'EXPIRED')
        ) THEN 1 END)::int as attention_required
      FROM vehicles v
      WHERE v.deleted_at IS NULL
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
    };
  },

  async findById(id: string): Promise<VehicleRecord | null> {
    const res = await query(
      `SELECT v.*,
              (SELECT dr.id FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_id,
              (SELECT dr.run_code FROM delivery_runs dr WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_run_code,
              (SELECT u.name FROM delivery_runs dr JOIN users u ON dr.driver_id = u.id WHERE dr.vehicle_id = v.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS') ORDER BY dr.created_at DESC LIMIT 1) as active_driver_name
       FROM vehicles v
       WHERE v.id = $1 AND v.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    return res.rows[0] || null;
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
    city?: string;
    state?: string;
    depot?: string;
    status?: string;
    currentOdometerKm?: number;
    notes?: string;
  }): Promise<VehicleRecord> {
    // Generate auto vehicle code if not provided
    let vCode = data.vehicleCode?.trim().toUpperCase();
    if (!vCode) {
      const countRes = await query(`SELECT COUNT(*)::int as c FROM vehicles`);
      const nextSeq = (countRes.rows[0]?.c || 0) + 1001;
      vCode = `VEH-${nextSeq}`;
    }

    const res = await query(
      `INSERT INTO vehicles (
        vehicle_code, registration_number, make_model, vehicle_type,
        capacity_kg, capacity_crates, fuel_type, is_refrigerated,
        city, state, depot, status, is_active, current_odometer_km, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, TRUE, $13, $14)
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
        data.city || 'Pune',
        data.state || 'Maharashtra',
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

    const allowed = [
      'registration_number',
      'make_model',
      'vehicle_type',
      'capacity_kg',
      'capacity_crates',
      'fuel_type',
      'is_refrigerated',
      'city',
      'state',
      'depot',
      'status',
      'is_active',
      'current_odometer_km',
      'notes',
    ];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        values.push(data[key]);
        fields.push(`${key} = $${values.length}`);
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
       ORDER BY vd.created_at ASC`,
      [vehicleId]
    );
    return res.rows;
  },

  async upsertDocument(data: {
    vehicleId: string;
    documentType: string;
    documentNumber: string;
    issueDate?: string;
    expiryDate?: string;
    verificationStatus?: string;
    fileUrl?: string;
    verifiedBy?: string;
    notes?: string;
  }): Promise<any> {
    const res = await query(
      `INSERT INTO vehicle_documents (
        vehicle_id, document_type, document_number, issue_date, expiry_date,
        verification_status, file_url, verified_by, verified_at, notes
       )
       VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8::uuid, CASE WHEN $8::uuid IS NOT NULL THEN NOW() ELSE NULL END, $9)
       ON CONFLICT (vehicle_id, document_type) DO UPDATE
       SET document_number = EXCLUDED.document_number,
           issue_date = EXCLUDED.issue_date,
           expiry_date = EXCLUDED.expiry_date,
           verification_status = EXCLUDED.verification_status,
           file_url = COALESCE(EXCLUDED.file_url, vehicle_documents.file_url),
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
        data.verifiedBy || null,
        data.notes || null,
      ]
    );
    return res.rows[0];
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

    // Update vehicle's current odometer if new service has higher odometer
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
              r.route_code, r.name as route_name, r.city as route_city,
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
