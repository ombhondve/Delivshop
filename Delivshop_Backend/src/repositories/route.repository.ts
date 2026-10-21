import { query, dbPool } from '../config/database.js';
import { generateRouteCode } from '../services/route-code.service.js';
import { googleRoutesService } from '../services/google-routes.service.js';

export interface RouteStop {
  id?: string;
  route_id?: string;
  shop_id: string;
  stop_sequence: number;
  planned_arrival_time?: string | null;
  service_time_minutes?: number;
  delivery_instructions?: string | null;
  shop_name?: string;
  shop_address?: string;
  shop_area?: string;
  shop_city?: string;
  shop_latitude?: number | null;
  shop_longitude?: number | null;
  is_location_verified?: boolean;
  delivery_contact_name?: string | null;
  delivery_contact_phone?: string | null;
}

export interface RouteRecord {
  id: string;
  route_code: string;
  name: string;
  city: string;
  state: string;
  depot: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'INACTIVE' | 'ARCHIVED';
  total_distance_km: number;
  estimated_duration_minutes: number;
  routing_fingerprint?: string | null;
  distance_calculated_at?: string | null;
  version: number;
  stops_count?: number;
  created_at: string;
  updated_at: string;
  stops?: RouteStop[];
}

export const routeRepository = {
  async listAll(params?: {
    search?: string;
    status?: string;
    city?: string;
    depot?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<RouteRecord[]> {
    const whereClauses: string[] = ['r.deleted_at IS NULL'];
    const values: any[] = [];

    if (params?.search) {
      values.push(`%${params.search.toLowerCase().trim()}%`);
      const idx = values.length;
      whereClauses.push(
        `(LOWER(r.route_code) LIKE $${idx} OR LOWER(r.name) LIKE $${idx} OR LOWER(r.city) LIKE $${idx} OR LOWER(r.depot) LIKE $${idx})`
      );
    }

    if (params?.status && params.status !== 'ALL') {
      if (params.status === 'PUBLISHED' || params.status === 'ACTIVE') {
        whereClauses.push(`r.status IN ('PUBLISHED', 'ACTIVE')`);
      } else {
        values.push(params.status);
        whereClauses.push(`r.status = $${values.length}`);
      }
    }

    if (params?.city && params.city !== 'ALL') {
      values.push(params.city);
      whereClauses.push(`r.city = $${values.length}`);
    }

    if (params?.depot && params.depot !== 'ALL') {
      values.push(params.depot);
      whereClauses.push(`r.depot = $${values.length}`);
    }

    let sortCol = 'r.route_code';
    if (params?.sortBy === 'name') sortCol = 'r.name';
    else if (params?.sortBy === 'stops') sortCol = 'stops_count';
    else if (params?.sortBy === 'created_at') sortCol = 'r.created_at';
    else if (params?.sortBy === 'distance') sortCol = 'r.total_distance_km';

    const orderDir = params?.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const sql = `
      SELECT r.*,
             (SELECT COUNT(*)::int FROM route_stops rs WHERE rs.route_id = r.id) as stops_count,
             (SELECT COUNT(*)::int FROM delivery_runs dr WHERE dr.route_id = r.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')) as active_runs_count
      FROM routes r
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortCol} ${orderDir}
    `;

    const res = await query(sql, values);
    return res.rows;
  },

  async getSummary(): Promise<{
    totalRoutes: number;
    dispatchableRoutes: number;
    publishedRoutes: number;
    activeRoutes: number;
    draftRoutes: number;
    inactiveRoutes: number;
    totalStopsConfigured: number;
    avgDistanceKm: number;
    measuredRoutesCount: number;
    readinessPercentage: number;
  }> {
    const res = await query(`
      SELECT
        COUNT(r.id)::int as total_routes,
        COUNT(CASE WHEN status IN ('PUBLISHED', 'ACTIVE') AND (SELECT COUNT(rs.id) FROM route_stops rs WHERE rs.route_id = r.id) > 0 THEN 1 END)::int as dispatchable_routes,
        COUNT(CASE WHEN status IN ('PUBLISHED', 'ACTIVE') THEN 1 END)::int as published_routes,
        COUNT(CASE WHEN status = 'DRAFT' THEN 1 END)::int as draft_routes,
        COUNT(CASE WHEN status = 'INACTIVE' THEN 1 END)::int as inactive_routes,
        (SELECT COUNT(rs.id)::int FROM route_stops rs JOIN routes r2 ON rs.route_id = r2.id WHERE r2.deleted_at IS NULL) as total_stops_configured,
        COALESCE(ROUND(AVG(total_distance_km) FILTER (WHERE total_distance_km > 0), 1), 0)::numeric as avg_distance_km,
        COUNT(CASE WHEN total_distance_km > 0 THEN 1 END)::int as measured_routes_count
      FROM routes r
      WHERE r.deleted_at IS NULL
    `);
    const r = res.rows[0] || {};
    const total = Number(r.total_routes) || 0;
    const dispatchable = Number(r.dispatchable_routes) || 0;
    const readiness = total > 0 ? Math.round((dispatchable / total) * 100) : 0;
    return {
      totalRoutes: total,
      dispatchableRoutes: dispatchable,
      publishedRoutes: Number(r.published_routes) || 0,
      activeRoutes: Number(r.published_routes) || 0,
      draftRoutes: Number(r.draft_routes) || 0,
      inactiveRoutes: Number(r.inactive_routes) || 0,
      totalStopsConfigured: Number(r.total_stops_configured) || 0,
      avgDistanceKm: Number(r.avg_distance_km) || 0,
      measuredRoutesCount: Number(r.measured_routes_count) || 0,
      readinessPercentage: readiness,
    };
  },

  async findById(id: string): Promise<RouteRecord | null> {
    const routeRes = await query(
      `SELECT r.*,
              (SELECT COUNT(*)::int FROM route_stops rs WHERE rs.route_id = r.id) as stops_count,
              (SELECT COUNT(*)::int FROM delivery_runs dr WHERE dr.route_id = r.id AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')) as active_runs_count
       FROM routes r
       WHERE r.id = $1 AND r.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );

    if (!routeRes.rows[0]) return null;
    const route = routeRes.rows[0];

    const stopsRes = await query(
      `SELECT rs.*,
              s.name as shop_name, s.address as shop_address, s.area as shop_area, s.city as shop_city,
              s.latitude as shop_latitude, s.longitude as shop_longitude, s.is_location_verified,
              s.delivery_contact_name, s.delivery_contact_phone, s.delivery_window as shop_delivery_window
       FROM route_stops rs
       JOIN shops s ON rs.shop_id = s.id
       WHERE rs.route_id = $1
       ORDER BY rs.stop_sequence ASC`,
      [id]
    );

    route.stops = stopsRes.rows;
    return route;
  },

  async findByCode(code: string): Promise<RouteRecord | null> {
    const res = await query(
      `SELECT * FROM routes WHERE LOWER(route_code) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [code.trim()]
    );
    return res.rows[0] || null;
  },

  async createWithStops(
    data: {
      routeCode?: string;
      name: string;
      city?: string;
      state?: string;
      depot?: string;
      description?: string;
      status?: 'DRAFT' | 'ACTIVE' | 'PUBLISHED' | 'INACTIVE' | 'ARCHIVED';
      totalDistanceKm?: number;
      estimatedDurationMinutes?: number;
      stops?: Array<{
        shopId: string;
        stopSequence: number;
        plannedArrivalTime?: string;
        serviceTimeMinutes?: number;
        deliveryInstructions?: string;
      }>;
    },
    creatorId?: string
  ): Promise<RouteRecord> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      let rCode = data.routeCode?.trim().toUpperCase();
      if (!rCode) {
        rCode = await generateRouteCode(client);
      }

      const depotName = data.depot || 'Pune Central Cold Depot';
      let measuredDistanceKm = 0;
      let measuredDurationMinutes = 0;
      let routingFingerprint: string | null = null;
      let distanceCalculatedAt: Date | null = null;

      // If stops are finalized upon creation, calculate driving distance via centralized Google Routes service
      if (data.stops && data.stops.length > 0) {
        const shopIds = data.stops.map((s: any) => s.shopId);
        const shopsRes = await client.query(
          `SELECT id, address, city, latitude, longitude FROM shops WHERE id = ANY($1::uuid[])`,
          [shopIds]
        );
        const shopMap = new Map(shopsRes.rows.map((r: any) => [r.id, r]));

        const waypoints = data.stops.map((s: any) => {
          const shop = shopMap.get(s.shopId);
          return {
            shopId: s.shopId,
            latitude: shop?.latitude,
            longitude: shop?.longitude,
            address: shop?.address,
            city: shop?.city,
          };
        });

        const routingResult = await googleRoutesService.calculateRouteDistance({
          depot: depotName,
          stops: waypoints,
          feature: 'ROUTE_CREATION',
        });

        if (routingResult) {
          measuredDistanceKm = routingResult.distanceKm;
          measuredDurationMinutes = routingResult.durationMinutes;
          routingFingerprint = routingResult.fingerprint;
          distanceCalculatedAt = new Date();
        }
      }

      const insertRouteRes = await client.query(
        `INSERT INTO routes (
          route_code, name, city, state, depot, description, status,
          total_distance_km, estimated_duration_minutes, routing_fingerprint,
          distance_calculated_at, version
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1)
         RETURNING *`,
        [
          rCode,
          data.name.trim(),
          data.city || 'Pune',
          data.state || 'Maharashtra',
          depotName,
          data.description || null,
          data.status || 'DRAFT',
          measuredDistanceKm,
          measuredDurationMinutes,
          routingFingerprint,
          distanceCalculatedAt,
        ]
      );
      const newRoute = insertRouteRes.rows[0];

      if (data.stops && data.stops.length > 0) {
        for (let i = 0; i < data.stops.length; i++) {
          const s = data.stops[i];
          await client.query(
            `INSERT INTO route_stops (
              route_id, shop_id, stop_sequence, planned_arrival_time, service_time_minutes, delivery_instructions
             )
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              newRoute.id,
              s.shopId,
              i + 1, // ensure contiguous 1-indexed sequence
              s.plannedArrivalTime || null,
              s.serviceTimeMinutes || 10,
              s.deliveryInstructions || null,
            ]
          );
        }

        // Snapshot initial version
        await client.query(
          `INSERT INTO route_versions (route_id, version_number, stops_snapshot, changes_summary, created_by)
           VALUES ($1, 1, $2, $3, $4)`,
          [
            newRoute.id,
            JSON.stringify(data.stops),
            'Initial route template created with stops',
            creatorId || null,
          ]
        );
      }

      await client.query('COMMIT');
      return newRoute;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateStopsAndVersion(
    routeId: string,
    stops: Array<{
      shopId: string;
      stopSequence: number;
      plannedArrivalTime?: string;
      serviceTimeMinutes?: number;
      deliveryInstructions?: string;
    }>,
    changesSummary?: string,
    actorId?: string
  ): Promise<RouteRecord | null> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // Get current route version
      const currentRouteRes = await client.query(`SELECT * FROM routes WHERE id = $1 FOR UPDATE`, [routeId]);
      if (!currentRouteRes.rows[0]) {
        await client.query('ROLLBACK');
        return null;
      }
      const currentRoute = currentRouteRes.rows[0];
      const nextVersion = currentRoute.version + 1;

      // Clear existing stops and insert new sequenced stops
      await client.query(`DELETE FROM route_stops WHERE route_id = $1`, [routeId]);

      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        await client.query(
          `INSERT INTO route_stops (
            route_id, shop_id, stop_sequence, planned_arrival_time, service_time_minutes, delivery_instructions
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            routeId,
            s.shopId,
            i + 1,
            s.plannedArrivalTime || null,
            s.serviceTimeMinutes || 10,
            s.deliveryInstructions || null,
          ]
        );
      }

      // Resolve coordinates and addresses for ordered stops
      const shopIds = stops.map((s) => s.shopId);
      const shopsRes = await client.query(
        `SELECT id, address, city, latitude, longitude FROM shops WHERE id = ANY($1::uuid[])`,
        [shopIds]
      );
      const shopMap = new Map(shopsRes.rows.map((r: any) => [r.id, r]));

      const waypoints = stops.map((s) => {
        const shop = shopMap.get(s.shopId);
        return {
          shopId: s.shopId,
          latitude: shop?.latitude,
          longitude: shop?.longitude,
          address: shop?.address,
          city: shop?.city,
        };
      });

      const depotName = currentRoute.depot || 'Pune Central Cold Depot';
      const routingResult = await googleRoutesService.calculateRouteDistance({
        depot: depotName,
        stops: waypoints,
        feature: 'ROUTE_STOPS_UPDATE',
        existingFingerprint: currentRoute.routing_fingerprint,
        existingDistanceKm: currentRoute.total_distance_km,
      });

      let finalDistance = Number(currentRoute.total_distance_km) || 0;
      let finalDuration = Number(currentRoute.estimated_duration_minutes) || 0;
      let finalFingerprint = currentRoute.routing_fingerprint || null;
      let calcDate = currentRoute.distance_calculated_at || null;

      if (routingResult) {
        finalDistance = routingResult.distanceKm;
        finalDuration = routingResult.durationMinutes;
        finalFingerprint = routingResult.fingerprint;
        calcDate = new Date();
      }

      // Update route version, metrics, fingerprint and updated_at
      await client.query(
        `UPDATE routes 
         SET version = $1, total_distance_km = $2, estimated_duration_minutes = $3,
             routing_fingerprint = $4, distance_calculated_at = $5, updated_at = NOW() 
         WHERE id = $6`,
        [nextVersion, finalDistance, finalDuration, finalFingerprint, calcDate, routeId]
      );

      // Record immutable snapshot in route_versions
      await client.query(
        `INSERT INTO route_versions (route_id, version_number, stops_snapshot, changes_summary, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          routeId,
          nextVersion,
          JSON.stringify(stops),
          changesSummary || `Stops resequenced to version ${nextVersion}`,
          actorId || null,
        ]
      );

      await client.query('COMMIT');
      return this.findById(routeId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(routeId: string, data: any): Promise<RouteRecord | null> {
    const fields: string[] = [];
    const values: any[] = [];

    const payload = { ...data };
    if (payload.totalDistanceKm !== undefined && payload.total_distance_km === undefined) {
      payload.total_distance_km = payload.totalDistanceKm;
    }
    if (payload.estimatedDurationMinutes !== undefined && payload.estimated_duration_minutes === undefined) {
      payload.estimated_duration_minutes = payload.estimatedDurationMinutes;
    }

    const allowed = ['name', 'city', 'state', 'depot', 'description', 'status', 'total_distance_km', 'estimated_duration_minutes'];

    for (const key of allowed) {
      if (payload[key] !== undefined) {
        values.push(payload[key]);
        fields.push(`${key} = $${values.length}`);
      }
    }

    if (fields.length === 0) {
      return this.findById(routeId);
    }

    values.push(routeId);
    await query(
      `UPDATE routes 
       SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = $${values.length} AND deleted_at IS NULL`,
      values
    );

    return this.findById(routeId);
  },

  async getVersions(routeId: string): Promise<any[]> {
    const res = await query(
      `SELECT rv.*, u.name as created_by_name
       FROM route_versions rv
       LEFT JOIN users u ON rv.created_by = u.id
       WHERE rv.route_id = $1
       ORDER BY rv.version_number DESC`,
      [routeId]
    );
    return res.rows;
  },

  async getAssignmentHistory(routeId: string): Promise<any[]> {
    const res = await query(
      `SELECT dr.*,
              v.registration_number as vehicle_registration, v.vehicle_type,
              u.name as driver_name, u.employee_id as driver_employee_id, u.phone as driver_phone
       FROM delivery_runs dr
       JOIN vehicles v ON dr.vehicle_id = v.id
       JOIN users u ON dr.driver_id = u.id
       WHERE dr.route_id = $1
       ORDER BY dr.delivery_date DESC, dr.created_at DESC
       LIMIT 50`,
      [routeId]
    );
    return res.rows;
  },

  async checkDependencies(routeId: string): Promise<{
    activeRunsCount: number;
    historicalRunsCount: number;
  }> {
    const activeRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_runs WHERE route_id = $1 AND status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')`,
      [routeId]
    );
    const histRes = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM delivery_runs WHERE route_id = $1`,
      [routeId]
    );
    return {
      activeRunsCount: parseInt(activeRes.rows[0]?.count || '0', 10),
      historicalRunsCount: parseInt(histRes.rows[0]?.count || '0', 10),
    };
  },

  async softDelete(routeId: string, actorId?: string, reason?: string): Promise<boolean> {
    await query(
      `UPDATE routes
       SET deleted_at = NOW(),
           deleted_by = $2,
           deletion_reason = $3,
           status = 'INACTIVE'
       WHERE id = $1`,
      [routeId, actorId || null, reason || 'Archived via administrative route deactivation']
    );
    return true;
  },

  async validateShopsEligibility(shopIds: string[]): Promise<{
    missingIds: string[];
    inactiveIds: string[];
  }> {
    if (!shopIds || shopIds.length === 0) return { missingIds: [], inactiveIds: [] };

    const res = await query(
      `SELECT id, status, deleted_at FROM shops WHERE id = ANY($1::uuid[])`,
      [shopIds]
    );

    const foundMap = new Map<string, { status: string; deleted_at: any }>();
    for (const r of res.rows) {
      foundMap.set(r.id, r);
    }

    const missingIds: string[] = [];
    const inactiveIds: string[] = [];

    for (const id of shopIds) {
      const shop = foundMap.get(id);
      if (!shop) {
        missingIds.push(id);
      } else if (shop.status !== 'ACTIVE' || shop.deleted_at !== null) {
        inactiveIds.push(id);
      }
    }

    return { missingIds, inactiveIds };
  },

  async recalculateRouteDistance(routeId: string, actorId?: string): Promise<RouteRecord> {
    const route = await this.findById(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    if (!route.stops || route.stops.length === 0) {
      throw new Error('Cannot calculate road distance: Route has no assigned delivery stops.');
    }

    const waypoints = route.stops.map((s: any) => ({
      shopId: s.shop_id || s.shopId,
      latitude: s.shop_latitude,
      longitude: s.shop_longitude,
      address: s.shop_address,
      city: s.shop_city,
    }));

    const depotName = route.depot || 'Pune Central Cold Depot';
    const routingResult = await googleRoutesService.calculateRouteDistance({
      depot: depotName,
      stops: waypoints,
      feature: 'MANUAL_RECALCULATION',
      forceRecalculate: true,
    });

    if (!routingResult) {
      throw new Error(
        'Unable to calculate road distance via Google Routes API. Please check server configuration and waypoint coordinates/addresses.'
      );
    }

    await query(
      `UPDATE routes
       SET total_distance_km = $1, estimated_duration_minutes = $2,
           routing_fingerprint = $3, distance_calculated_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [routingResult.distanceKm, routingResult.durationMinutes, routingResult.fingerprint, routeId]
    );

    return (await this.findById(routeId)) as RouteRecord;
  },
};

