import { query, dbPool } from '../config/database.js';

export interface DeliveryRunRecord {
  id: string;
  run_code: string;
  route_id: string;
  driver_id: string;
  vehicle_id: string;
  delivery_date: string;
  status: 'DRAFT' | 'VALIDATED' | 'ASSIGNED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  planned_stops_count: number;
  completed_stops_count: number;
  dispatch_time: string | null;
  completion_time: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  route_code?: string;
  route_name?: string;
  route_city?: string;
  driver_name?: string;
  driver_employee_id?: string;
  driver_phone?: string;
  vehicle_registration?: string;
  vehicle_code?: string;
  vehicle_type?: string;
  stops?: any[];
}

export const assignmentRepository = {
  async listAll(params?: {
    search?: string;
    deliveryDate?: string;
    status?: string;
    driverId?: string;
    vehicleId?: string;
    routeId?: string;
    city?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<DeliveryRunRecord[]> {
    const whereClauses: string[] = ['1=1'];
    const values: any[] = [];

    if (params?.search) {
      values.push(`%${params.search.toLowerCase().trim()}%`);
      const idx = values.length;
      whereClauses.push(
        `(LOWER(dr.run_code) LIKE $${idx} OR LOWER(r.name) LIKE $${idx} OR LOWER(u.name) LIKE $${idx} OR LOWER(v.registration_number) LIKE $${idx})`
      );
    }

    if (params?.deliveryDate) {
      values.push(params.deliveryDate);
      whereClauses.push(`dr.delivery_date = $${values.length}::date`);
    }

    if (params?.status && params.status !== 'ALL') {
      values.push(params.status);
      whereClauses.push(`dr.status = $${values.length}`);
    }

    if (params?.driverId) {
      values.push(params.driverId);
      whereClauses.push(`dr.driver_id = $${values.length}`);
    }

    if (params?.vehicleId) {
      values.push(params.vehicleId);
      whereClauses.push(`dr.vehicle_id = $${values.length}`);
    }

    if (params?.routeId) {
      values.push(params.routeId);
      whereClauses.push(`dr.route_id = $${values.length}`);
    }

    if (params?.city && params.city !== 'ALL') {
      values.push(params.city);
      whereClauses.push(`r.city = $${values.length}`);
    }

    let sortCol = 'dr.delivery_date';
    if (params?.sortBy === 'run_code') sortCol = 'dr.run_code';
    else if (params?.sortBy === 'status') sortCol = 'dr.status';
    else if (params?.sortBy === 'created_at') sortCol = 'dr.created_at';

    const orderDir = params?.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT dr.*,
             r.route_code, r.name as route_name, r.city as route_city, r.depot as route_depot,
             u.name as driver_name, u.employee_id as driver_employee_id, u.phone as driver_phone,
             v.registration_number as vehicle_registration, v.vehicle_code, v.vehicle_type, v.capacity_crates
      FROM delivery_runs dr
      JOIN routes r ON dr.route_id = r.id
      JOIN users u ON dr.driver_id = u.id
      JOIN vehicles v ON dr.vehicle_id = v.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortCol} ${orderDir}, dr.created_at DESC
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  async getSummary(date?: string): Promise<{
    totalAssignments: number;
    inProgress: number;
    readyToDispatch: number;
    completed: number;
    cancelled: number;
    todayAssignments: number;
  }> {
    const res = await query(`
      SELECT
        COUNT(*)::int as total_assignments,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END)::int as in_progress,
        COUNT(CASE WHEN status IN ('ASSIGNED', 'READY', 'VALIDATED') THEN 1 END)::int as ready_to_dispatch,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END)::int as cancelled,
        COUNT(CASE WHEN delivery_date = CURRENT_DATE THEN 1 END)::int as today_assignments
      FROM delivery_runs
    `);
    const r = res.rows[0] || {};
    return {
      totalAssignments: r.total_assignments || 0,
      inProgress: r.in_progress || 0,
      readyToDispatch: r.ready_to_dispatch || 0,
      completed: r.completed || 0,
      cancelled: r.cancelled || 0,
      todayAssignments: r.today_assignments || 0,
    };
  },

  async findById(id: string): Promise<DeliveryRunRecord | null> {
    const runRes = await query(
      `SELECT dr.*,
              r.route_code, r.name as route_name, r.city as route_city, r.depot as route_depot, r.total_distance_km, r.estimated_duration_minutes,
              u.name as driver_name, u.employee_id as driver_employee_id, u.phone as driver_phone, u.license_number as driver_license,
              v.registration_number as vehicle_registration, v.vehicle_code, v.vehicle_type, v.capacity_crates, v.capacity_kg, v.fuel_type, v.is_refrigerated
       FROM delivery_runs dr
       JOIN routes r ON dr.route_id = r.id
       JOIN users u ON dr.driver_id = u.id
       JOIN vehicles v ON dr.vehicle_id = v.id
       WHERE dr.id = $1
       LIMIT 1`,
      [id]
    );

    if (!runRes.rows[0]) return null;
    const run = runRes.rows[0];

    const stopsRes = await query(
      `SELECT drs.*,
              s.name as shop_name, s.address as shop_address, s.area as shop_area, s.city as shop_city,
              s.latitude as shop_latitude, s.longitude as shop_longitude, s.is_location_verified,
              s.delivery_contact_name, s.delivery_contact_phone, s.delivery_instructions as default_instructions
       FROM delivery_run_stops drs
       JOIN shops s ON drs.shop_id = s.id
       WHERE drs.run_id = $1
       ORDER BY drs.stop_sequence ASC`,
      [id]
    );

    run.stops = stopsRes.rows;
    return run;
  },

  async validateConstraints(params: {
    driverId: string;
    vehicleId: string;
    routeId: string;
    deliveryDate: string;
    excludeRunId?: string;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Driver verification
    const driverRes = await query(
      `SELECT id, name, is_active, license_expiry, deleted_at FROM users WHERE id = $1 AND role = 'DRIVER'`,
      [params.driverId]
    );
    if (!driverRes.rows[0] || driverRes.rows[0].deleted_at) {
      errors.push('The selected driver does not exist or has been deleted.');
    } else {
      const drv = driverRes.rows[0];
      if (!drv.is_active) {
        errors.push(`Driver ${drv.name} is currently inactive/off-duty.`);
      }
      if (drv.license_expiry && new Date(drv.license_expiry) < new Date(params.deliveryDate)) {
        errors.push(`Driver ${drv.name}'s driving license will be expired by the delivery date (${params.deliveryDate}).`);
      }
    }

    // 2. Vehicle verification
    const vehicleRes = await query(
      `SELECT id, registration_number, status, is_active, deleted_at FROM vehicles WHERE id = $1`,
      [params.vehicleId]
    );
    if (!vehicleRes.rows[0] || vehicleRes.rows[0].deleted_at) {
      errors.push('The selected vehicle does not exist or has been deleted.');
    } else {
      const veh = vehicleRes.rows[0];
      if (!veh.is_active || veh.status === 'INACTIVE') {
        errors.push(`Vehicle ${veh.registration_number} is marked INACTIVE.`);
      } else if (veh.status === 'UNDER_MAINTENANCE') {
        errors.push(`Vehicle ${veh.registration_number} is currently UNDER MAINTENANCE.`);
      }

      // Check document expiry for vehicle
      const docRes = await query(
        `SELECT document_type, expiry_date, verification_status 
         FROM vehicle_documents 
         WHERE vehicle_id = $1 AND document_type IN ('RC', 'INSURANCE', 'PUC')`,
        [params.vehicleId]
      );
      for (const doc of docRes.rows) {
        if (doc.expiry_date && new Date(doc.expiry_date) < new Date(params.deliveryDate)) {
          errors.push(`Vehicle document ${doc.document_type} is expired or will expire before delivery date.`);
        }
      }
    }

    // 3. Route verification
    const routeRes = await query(
      `SELECT id, name, status, deleted_at, (SELECT COUNT(*)::int FROM route_stops WHERE route_id = $1) as stop_count 
       FROM routes WHERE id = $1`,
      [params.routeId]
    );
    if (!routeRes.rows[0] || routeRes.rows[0].deleted_at) {
      errors.push('The selected delivery route does not exist.');
    } else {
      const r = routeRes.rows[0];
      if (r.status !== 'ACTIVE') {
        errors.push(`Route "${r.name}" is in ${r.status} status and cannot be dispatched.`);
      }
      if (r.stop_count === 0) {
        errors.push(`Route "${r.name}" has no stops configured.`);
      }
    }

    // 4. Overlapping Driver Assignment Check
    const driverConflictQuery = params.excludeRunId
      ? `SELECT run_code FROM delivery_runs WHERE driver_id = $1 AND delivery_date = $2::date AND id != $3 AND status NOT IN ('CANCELLED') LIMIT 1`
      : `SELECT run_code FROM delivery_runs WHERE driver_id = $1 AND delivery_date = $2::date AND status NOT IN ('CANCELLED') LIMIT 1`;
    const driverConflictValues = params.excludeRunId
      ? [params.driverId, params.deliveryDate, params.excludeRunId]
      : [params.driverId, params.deliveryDate];
    const drvConflict = await query(driverConflictQuery, driverConflictValues);
    if (drvConflict.rows[0]) {
      errors.push(`Driver is already assigned to active delivery run ${drvConflict.rows[0].run_code} on ${params.deliveryDate}.`);
    }

    // 5. Overlapping Vehicle Assignment Check
    const vehicleConflictQuery = params.excludeRunId
      ? `SELECT run_code FROM delivery_runs WHERE vehicle_id = $1 AND delivery_date = $2::date AND id != $3 AND status NOT IN ('CANCELLED') LIMIT 1`
      : `SELECT run_code FROM delivery_runs WHERE vehicle_id = $1 AND delivery_date = $2::date AND status NOT IN ('CANCELLED') LIMIT 1`;
    const vehicleConflictValues = params.excludeRunId
      ? [params.vehicleId, params.deliveryDate, params.excludeRunId]
      : [params.vehicleId, params.deliveryDate];
    const vehConflict = await query(vehicleConflictQuery, vehicleConflictValues);
    if (vehConflict.rows[0]) {
      errors.push(`Vehicle is already assigned to active delivery run ${vehConflict.rows[0].run_code} on ${params.deliveryDate}.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  },

  async createRun(
    data: {
      routeId: string;
      driverId: string;
      vehicleId: string;
      deliveryDate: string;
      notes?: string;
    },
    creatorId?: string
  ): Promise<DeliveryRunRecord> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // Lock row to prevent race conditions
      await client.query('SELECT pg_advisory_xact_lock(88129);');

      // Run constraint validation within transaction
      const validation = await this.validateConstraints({
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        routeId: data.routeId,
        deliveryDate: data.deliveryDate,
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join(' '));
      }

      // Generate unique Run Code: RUN-YYYYMMDD-XX
      const dateStr = data.deliveryDate.replace(/-/g, '');
      const countRes = await client.query(
        `SELECT COUNT(*)::int as c FROM delivery_runs WHERE delivery_date = $1::date`,
        [data.deliveryDate]
      );
      const seq = String((countRes.rows[0]?.c || 0) + 1).padStart(2, '0');
      const runCode = `RUN-${dateStr}-${seq}`;

      // Fetch route stops to snapshot into delivery_run_stops
      const routeStopsRes = await client.query(
        `SELECT shop_id, stop_sequence, delivery_instructions FROM route_stops WHERE route_id = $1 ORDER BY stop_sequence ASC`,
        [data.routeId]
      );
      const stops = routeStopsRes.rows;

      // Insert delivery run
      const insertRunRes = await client.query(
        `INSERT INTO delivery_runs (
          run_code, route_id, driver_id, vehicle_id, delivery_date,
          status, planned_stops_count, completed_stops_count, notes, created_by
         )
         VALUES ($1, $2, $3, $4, $5::date, 'ASSIGNED', $6, 0, $7, $8)
         RETURNING *`,
        [
          runCode,
          data.routeId,
          data.driverId,
          data.vehicleId,
          data.deliveryDate,
          stops.length,
          data.notes || null,
          creatorId || null,
        ]
      );
      const newRun = insertRunRes.rows[0];

      // Insert snapshot stops
      for (const stop of stops) {
        await client.query(
          `INSERT INTO delivery_run_stops (
            run_id, shop_id, stop_sequence, status, notes
           )
           VALUES ($1, $2, $3, 'PENDING', $4)`,
          [newRun.id, stop.shop_id, stop.stop_sequence, stop.delivery_instructions || null]
        );
      }

      // Update vehicle status to ASSIGNED
      await client.query(`UPDATE vehicles SET status = 'ASSIGNED', updated_at = NOW() WHERE id = $1`, [data.vehicleId]);

      await client.query('COMMIT');
      return (await this.findById(newRun.id)) as DeliveryRunRecord;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateStatus(
    runId: string,
    status: 'DRAFT' | 'VALIDATED' | 'ASSIGNED' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    notes?: string
  ): Promise<DeliveryRunRecord | null> {
    const isCompleted = status === 'COMPLETED';
    const isInProgress = status === 'IN_PROGRESS';

    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const currentRunRes = await client.query(`SELECT vehicle_id FROM delivery_runs WHERE id = $1 FOR UPDATE`, [runId]);
      if (!currentRunRes.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const vehicleId = currentRunRes.rows[0].vehicle_id;

      await client.query(
        `UPDATE delivery_runs
         SET status = $1,
             dispatch_time = CASE WHEN $2 = TRUE AND dispatch_time IS NULL THEN NOW() ELSE dispatch_time END,
             completion_time = CASE WHEN $3 = TRUE THEN NOW() ELSE completion_time END,
             notes = COALESCE($4, notes),
             updated_at = NOW()
         WHERE id = $5`,
        [status, isInProgress, isCompleted, notes ?? null, runId]
      );

      // If completed or cancelled, free up the vehicle to AVAILABLE
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        await client.query(
          `UPDATE vehicles SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1 AND status = 'ASSIGNED'`,
          [vehicleId]
        );
      } else if (status === 'IN_PROGRESS' || status === 'ASSIGNED' || status === 'READY') {
        await client.query(
          `UPDATE vehicles SET status = 'ASSIGNED', updated_at = NOW() WHERE id = $1`,
          [vehicleId]
        );
      }

      await client.query('COMMIT');
      return this.findById(runId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateStopStatus(
    runId: string,
    stopSequence: number,
    status: 'PENDING' | 'ARRIVED' | 'DELIVERED' | 'FAILED' | 'SKIPPED',
    notes?: string,
    proofOfDeliveryUrl?: string,
    failureReason?: string
  ): Promise<any> {
    const isDelivered = status === 'DELIVERED';
    const isArrived = status === 'ARRIVED';

    const res = await query(
      `UPDATE delivery_run_stops
       SET status = $1,
           arrival_time = CASE WHEN $2 = TRUE THEN NOW() ELSE arrival_time END,
           delivery_time = CASE WHEN $3 = TRUE THEN NOW() ELSE delivery_time END,
           notes = COALESCE($4, notes),
           proof_of_delivery_url = COALESCE($5, proof_of_delivery_url),
           failure_reason = COALESCE($6, failure_reason)
       WHERE run_id = $7 AND stop_sequence = $8
       RETURNING *`,
      [status, isArrived, isDelivered, notes ?? null, proofOfDeliveryUrl ?? null, failureReason ?? null, runId, stopSequence]
    );

    // Recalculate completed stops count on parent run
    await query(
      `UPDATE delivery_runs
       SET completed_stops_count = (SELECT COUNT(*)::int FROM delivery_run_stops WHERE run_id = $1 AND status = 'DELIVERED'),
           updated_at = NOW()
       WHERE id = $1`,
      [runId]
    );

    return res.rows[0];
  },
};
