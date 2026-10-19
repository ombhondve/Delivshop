import { query, dbPool } from '../config/database.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface DeliveryAvailabilityOption {
  date: string;
  deliveryRunId: string | null;
  runCode: string | null;
  routeName: string;
  routeCode: string;
  routeId: string;
  driverName: string | null;
  vehicleRegistration: string | null;
  deliveryWindow: string;
  totalCapacityCrates: number;
  assignedCrates: number;
  availableCrates: number;
  isAvailable: boolean;
  status: 'CONFIRMED_AVAILABLE' | 'CAPACITY_FULL' | 'UNPUBLISHED_DRAFT' | 'PAST_CUTOFF';
  cutoffTime: string;
  notes?: string;
}

export interface DeliveryAvailabilityResponse {
  shopId: string;
  shopName: string;
  hasRouteCoverage: boolean;
  hasRouteAssigned?: boolean;
  hasDriverAssigned?: boolean;
  scheduledDeliveryDate?: string | null;
  schedulingCase?: 'CASE_1' | 'CASE_2' | 'CASE_3' | 'CASE_4' | 'CASE_1_SCHEDULED' | 'CASE_2_NO_ROUTE' | 'CASE_3_NO_DATE' | 'CASE_4_NO_DRIVER' | string;
  schedulingTitle?: string;
  deliveryStatus?: 'Scheduled' | 'Pending' | string;
  schedulingMessage?: string | null;
  hasConfirmedDate?: boolean;
  deliveryRunId?: string | null;
  coveredRoutes: Array<{ id: string; name: string; routeCode: string }>;
  availableDates: DeliveryAvailabilityOption[];
  allowUnscheduledOrders: boolean;
  cutoffTime: string;
  isCutoffPassedForTomorrow: boolean;
  defaultDeliveryWindow: string;
  policyMessage: string;
}

export interface UnscheduledOrderRecord {
  id: string;
  orderNumber: string;
  shopId: string;
  shopName: string;
  shopCode: string;
  shopAddress: any;
  shopPhone: string;
  shopArea: string;
  shopCity: string;
  createdAt: string;
  timeAwaitingMinutes: number;
  timeAwaitingFormatted: string;
  requestedDeliveryDate: string | null;
  confirmedDeliveryDate: string | null;
  deliveryWindow: string | null;
  schedulingStatus: string;
  status: string;
  totalAmount: number;
  totalCratesCount: number;
  totalVolumeLitres: number;
  totalPackagesCount: number;
  notes: string | null;
  items: any[];
  itemsSummary: string;
  coveredRoutes: Array<{ id: string; name: string; routeCode: string }>;
  eligibleRuns: Array<{
    id: string;
    runCode: string;
    deliveryDate: string;
    routeId: string;
    routeName: string;
    driverName: string;
    vehicleRegistration: string;
    capacityCrates: number;
    assignedCrates: number;
    availableCrates: number;
    status: string;
    isPublished: boolean;
  }>;
}

export const schedulingService = {
  /**
   * Get supplier operational scheduling settings
   */
  async getSettings(): Promise<any> {
    const res = await query(`
      SELECT * FROM supplier_scheduling_settings
      ORDER BY created_at ASC
      LIMIT 1
    `);
    if (res.rows[0]) {
      return res.rows[0];
    }
    // Return sensible default if not seeded
    return {
      operating_city: 'Pune',
      order_cutoff_time: '18:00',
      min_lead_days: 1,
      max_advance_booking_days: 7,
      default_delivery_window: '06:00 AM - 09:00 AM',
      allow_ordering_without_published_run: true,
      timezone: 'Asia/Kolkata',
      operating_days: [1, 2, 3, 4, 5, 6, 7],
      holidays: [],
    };
  },

  /**
   * Update supplier operational scheduling settings
   */
  async updateSettings(data: {
    orderCutoffTime?: string;
    minLeadDays?: number;
    maxAdvanceBookingDays?: number;
    defaultDeliveryWindow?: string;
    allowOrderingWithoutPublishedRun?: boolean;
    operatingDays?: number[];
    holidays?: string[];
  }): Promise<any> {
    const current = await this.getSettings();
    const res = await query(
      `UPDATE supplier_scheduling_settings
       SET order_cutoff_time = COALESCE($1, order_cutoff_time),
           min_lead_days = COALESCE($2, min_lead_days),
           max_advance_booking_days = COALESCE($3, max_advance_booking_days),
           default_delivery_window = COALESCE($4, default_delivery_window),
           allow_ordering_without_published_run = COALESCE($5, allow_ordering_without_published_run),
           operating_days = COALESCE($6, operating_days),
           holidays = COALESCE($7, holidays),
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        data.orderCutoffTime ?? null,
        data.minLeadDays ?? null,
        data.maxAdvanceBookingDays ?? null,
        data.defaultDeliveryWindow ?? null,
        data.allowOrderingWithoutPublishedRun ?? null,
        data.operatingDays ?? null,
        data.holidays ?? null,
        current.id,
      ]
    );
    return res.rows[0];
  },

  /**
   * Calculate genuine delivery availability for a shop during checkout.
   * Evaluates route coverage, published delivery runs, vehicle capacities, and order cutoffs.
   */
  async getDeliveryAvailability(
    shopIdOrCode: string,
    orderCrates = 1
  ): Promise<DeliveryAvailabilityResponse> {
    // 1. Resolve shop
    const shopRes = await query(
      `SELECT id, name, shop_id, city, area, address, status, delivery_window
       FROM shops
       WHERE (id::text = $1 OR shop_id = $1)
       LIMIT 1`,
      [shopIdOrCode]
    );

    if (!shopRes.rows[0]) {
      throw new AppError('Shop not found', 404);
    }
    const shop = shopRes.rows[0];

    // 2. Load settings
    const settings = await this.getSettings();
    const cutoffTime = settings.order_cutoff_time || '18:00';
    const minLeadDays = settings.min_lead_days || 1;
    const maxAdvanceDays = settings.max_advance_booking_days || 7;
    const defaultWindow = shop.delivery_window || settings.default_delivery_window || '06:00 AM - 09:00 AM';

    // 3. Check current time in India timezone (Asia/Kolkata)
    const now = new Date();
    // Get local hours and minutes in IST
    const istString = now.toLocaleString('en-US', { timeZone: settings.timezone || 'Asia/Kolkata' });
    const istDate = new Date(istString);
    const currentHours = istDate.getHours();
    const currentMinutes = istDate.getMinutes();

    const [cutoffHours, cutoffMinutes] = cutoffTime.split(':').map(Number);
    const isPastCutoff = currentHours > cutoffHours || (currentHours === cutoffHours && currentMinutes >= cutoffMinutes);

    // 4. Find all routes that cover this shop
    const routesRes = await query(
      `SELECT r.id, r.name, r.route_code, r.city, rs.stop_sequence, rs.planned_arrival_time
       FROM route_stops rs
       JOIN routes r ON rs.route_id = r.id
       WHERE rs.shop_id = $1
         AND r.status IN ('ACTIVE', 'PUBLISHED')
         AND r.deleted_at IS NULL
       ORDER BY rs.stop_sequence ASC`,
      [shop.id]
    );
    const coveredRoutes = routesRes.rows;
    const hasRouteCoverage = coveredRoutes.length > 0;

    // 5. Generate date range to inspect
    const availableDates: DeliveryAvailabilityOption[] = [];
    const routeIds = coveredRoutes.map((r) => r.id);

    if (hasRouteCoverage && routeIds.length > 0) {
      // Start day: if minLeadDays=1 and past cutoff, start from day + 2; else day + minLeadDays
      const startDayOffset = isPastCutoff && minLeadDays === 1 ? 2 : minLeadDays;

      for (let offset = startDayOffset; offset <= maxAdvanceDays; offset++) {
        const candidateDateObj = new Date(istDate);
        candidateDateObj.setDate(candidateDateObj.getDate() + offset);
        const yyyy = candidateDateObj.getFullYear();
        const mm = String(candidateDateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(candidateDateObj.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        // Check if candidate date is in operating days (1=Mon ... 7=Sun)
        const dayOfWeek = candidateDateObj.getDay() === 0 ? 7 : candidateDateObj.getDay();
        if (Array.isArray(settings.operating_days) && !settings.operating_days.includes(dayOfWeek)) {
          continue;
        }

        // Check holidays
        if (Array.isArray(settings.holidays) && settings.holidays.includes(dateStr)) {
          continue;
        }

        // Search for published delivery runs for the covered routes on this date
        const runsRes = await query(
          `SELECT dr.id, dr.run_code, dr.route_id, dr.driver_id, dr.vehicle_id, dr.delivery_date,
                  dr.status, dr.is_published, dr.delivery_window,
                  r.name as route_name, r.route_code,
                  u.name as driver_name, u.is_active as driver_is_active, u.license_expiry,
                  v.registration_number as vehicle_registration, v.capacity_crates, v.status as vehicle_status,
                  v.is_active as vehicle_is_active,
                  COALESCE(
                    (SELECT SUM(total_crates_count) FROM orders 
                     WHERE delivery_run_id = dr.id AND scheduling_status IN ('SCHEDULED', 'OUT_FOR_DELIVERY')),
                    0
                  )::numeric as assigned_crates
           FROM delivery_runs dr
           JOIN routes r ON dr.route_id = r.id
           JOIN users u ON dr.driver_id = u.id
           JOIN vehicles v ON dr.vehicle_id = v.id
           WHERE dr.route_id = ANY($1::uuid[])
             AND dr.delivery_date = $2::date
             AND dr.is_published = TRUE
             AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS')
             AND dr.deleted_at IS NULL
           ORDER BY dr.created_at ASC`,
          [routeIds, dateStr]
        );

        for (const run of runsRes.rows) {
          const totalCapacity = Number(run.capacity_crates) || 80;
          const assigned = Number(run.assigned_crates) || 0;
          const available = Math.max(0, totalCapacity - assigned);

          // Check driver validity
          const isDriverValid = run.driver_is_active && (!run.license_expiry || new Date(run.license_expiry) >= new Date(dateStr));
          // Check vehicle validity
          const isVehicleValid = run.vehicle_is_active && run.vehicle_status !== 'UNDER_MAINTENANCE' && run.vehicle_status !== 'INACTIVE';

          const hasSufficientCapacity = available >= orderCrates;
          const isAvailable = run.is_published && isDriverValid && isVehicleValid && hasSufficientCapacity;

          let runStatus: DeliveryAvailabilityOption['status'] = 'CONFIRMED_AVAILABLE';
          if (!hasSufficientCapacity) runStatus = 'CAPACITY_FULL';

          availableDates.push({
            date: dateStr,
            deliveryRunId: run.id,
            runCode: run.run_code,
            routeName: run.route_name,
            routeCode: run.route_code,
            routeId: run.route_id,
            driverName: run.driver_name,
            vehicleRegistration: run.vehicle_registration,
            deliveryWindow: run.delivery_window || defaultWindow,
            totalCapacityCrates: totalCapacity,
            assignedCrates: assigned,
            availableCrates: available,
            isAvailable,
            status: runStatus,
            cutoffTime,
            notes: isAvailable ? 'Confirmed delivery run published and available' : 'Run capacity currently full',
          });
        }
      }
    }

    // Policy message construction
    let policyMessage = '';
    if (!hasRouteCoverage) {
      policyMessage = settings.allow_ordering_without_published_run
        ? 'No scheduled delivery run currently covers your location for immediate confirmation. You may submit your requested delivery date; our logistics dispatch team will confirm your delivery schedule.'
        : 'Delivery is currently not available for this area. Orders outside confirmed published runs are disabled by supplier policy.';
    } else if (availableDates.filter((d) => d.isAvailable).length === 0) {
      policyMessage = settings.allow_ordering_without_published_run
        ? 'No open published delivery runs are currently available on upcoming dates. You may place your order with a requested date, and our supplier logistics team will schedule and confirm your delivery.'
        : 'All published runs are currently at full vehicle capacity. Please contact support or wait for next run publication.';
    } else {
      policyMessage = isPastCutoff
        ? `Daily order cutoff (${cutoffTime} IST) has passed for next-day dispatch. Earliest confirmed run offered below.`
        : 'Published delivery run available with guaranteed cold-chain capacity.';
    }

    // Determine authoritative scheduling state
    let schedulingCase: 'CASE_1_SCHEDULED' | 'CASE_2_NO_ROUTE' | 'CASE_3_NO_DATE' | 'CASE_4_NO_DRIVER' = 'CASE_2_NO_ROUTE';
    let schedulingMessage = '';
    let scheduledDeliveryDate: string | null = null;
    let earliestRunId: string | null = null;
    let hasRouteAssigned = hasRouteCoverage;
    let hasDriverAssigned = false;
    let deliveryStatus: 'Scheduled' | 'Pending' = 'Pending';

    if (!hasRouteCoverage) {
      // Case 2: No Delivery Route Assigned
      schedulingCase = 'CASE_2_NO_ROUTE';
      schedulingMessage = 'Your delivery date will be confirmed after the supplier assigns a delivery route.';
      deliveryStatus = 'Pending';
    } else {
      // Check all upcoming runs on the covered routes to inspect date and driver presence
      const allUpcomingRunsRes = await query(
        `SELECT dr.id, dr.delivery_date, dr.delivery_window, dr.driver_id, dr.status, dr.is_published,
                u.id as driver_user_id, u.name as driver_name, u.is_active as driver_is_active
         FROM delivery_runs dr
         LEFT JOIN users u ON dr.driver_id = u.id AND u.deleted_at IS NULL
         WHERE dr.route_id = ANY($1::uuid[])
           AND dr.is_published = TRUE
           AND dr.status IN ('ASSIGNED', 'READY', 'IN_PROGRESS', 'VALIDATED')
           AND dr.deleted_at IS NULL
           AND dr.delivery_date >= CURRENT_DATE
         ORDER BY dr.delivery_date ASC
         LIMIT 1`,
        [routeIds]
      );

      const earliestRun = allUpcomingRunsRes.rows[0];
      if (earliestRun) {
        earliestRunId = earliestRun.id;
      }
      if (!earliestRun || !earliestRun.delivery_date) {
        // Case 3: Route Assigned but Delivery Date Missing
        schedulingCase = 'CASE_3_NO_DATE';
        schedulingMessage = 'Your delivery date is not confirmed yet.';
        deliveryStatus = 'Pending';
      } else if (!earliestRun.driver_id || earliestRun.driver_is_active === false) {
        // Case 4: Route Assigned but Driver Missing
        schedulingCase = 'CASE_4_NO_DRIVER';
        schedulingMessage = 'Your delivery date is not confirmed yet.';
        deliveryStatus = 'Pending';
      } else {
        // Case 1: Delivery Route and Date Assigned (Route + Driver + Valid Date)
        schedulingCase = 'CASE_1_SCHEDULED';
        schedulingMessage = 'Delivery scheduled';
        hasDriverAssigned = true;
        deliveryStatus = 'Scheduled';
        scheduledDeliveryDate = typeof earliestRun.delivery_date === 'string'
          ? earliestRun.delivery_date.slice(0, 10)
          : new Date(earliestRun.delivery_date).toISOString().slice(0, 10);
      }
    }

    const canonicalCase =
      schedulingCase === 'CASE_1_SCHEDULED' ? 'CASE_1' :
      schedulingCase === 'CASE_2_NO_ROUTE' ? 'CASE_2' :
      schedulingCase === 'CASE_3_NO_DATE' ? 'CASE_3' : 'CASE_4';

    const schedulingTitle = canonicalCase === 'CASE_1' ? 'Scheduled Delivery' : 'Delivery Scheduling';

    return {
      shopId: shop.id,
      shopName: shop.name,
      hasRouteCoverage,
      hasRouteAssigned,
      hasDriverAssigned,
      scheduledDeliveryDate,
      schedulingCase: canonicalCase,
      schedulingTitle,
      deliveryStatus,
      schedulingMessage: canonicalCase === 'CASE_1' ? null : schedulingMessage,
      hasConfirmedDate: Boolean(scheduledDeliveryDate),
      deliveryRunId: canonicalCase === 'CASE_1' ? (availableDates[0]?.deliveryRunId || earliestRunId || null) : null,
      coveredRoutes: coveredRoutes.map((r) => ({
        id: r.id,
        name: r.name,
        routeCode: r.route_code,
      })),
      availableDates,
      allowUnscheduledOrders: settings.allow_ordering_without_published_run,
      cutoffTime,
      isCutoffPassedForTomorrow: isPastCutoff,
      defaultDeliveryWindow: defaultWindow,
      policyMessage,
    };
  },

  /**
   * Retrieve list of unscheduled orders awaiting route assignment.
   */
  async getUnscheduledOrders(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: UnscheduledOrderRecord[]; total: number }> {
    const whereConditions: string[] = ["o.scheduling_status = 'AWAITING_SCHEDULING'"];
    const values: any[] = [];

    if (params?.search && params.search.trim()) {
      values.push(`%${params.search.toLowerCase().trim()}%`);
      const idx = values.length;
      whereConditions.push(
        `(LOWER(o.order_number) LIKE $${idx} OR LOWER(s.name) LIKE $${idx} OR LOWER(s.shop_id) LIKE $${idx} OR LOWER(s.area) LIKE $${idx})`
      );
    }

    const whereClause = whereConditions.join(' AND ');

    // Total count
    const countRes = await query(
      `SELECT COUNT(*)::int as total
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       WHERE ${whereClause}`,
      values
    );
    const total = countRes.rows[0]?.total || 0;

    const limit = params?.limit ? Math.min(Math.max(1, params.limit), 100) : 50;
    const offset = params?.offset ? Math.max(0, params.offset) : 0;

    const dataRes = await query(
      `SELECT o.*,
              s.name as shop_name, s.shop_id as shop_code, s.phone as shop_phone,
              s.address as shop_address, s.area as shop_area, s.city as shop_city,
              s.latitude as shop_latitude, s.longitude as shop_longitude,
              ROUND(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 60)::int as awaiting_minutes,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', oi.id,
                    'productId', oi.product_id,
                    'name', p.name,
                    'sku', p.sku,
                    'category', p.category,
                    'packSize', p.pack_size,
                    'quantity', oi.quantity,
                    'cratesCount', oi.crates_count,
                    'volumeLitres', oi.volume_litres,
                    'unitPrice', oi.unit_price,
                    'totalPrice', oi.total_price
                  )
                ) FILTER (WHERE oi.id IS NOT NULL),
                '[]'
              ) as items
       FROM orders o
       JOIN shops s ON o.shop_id = s.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE ${whereClause}
       GROUP BY o.id, s.name, s.shop_id, s.phone, s.address, s.area, s.city, s.latitude, s.longitude
       ORDER BY o.created_at ASC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    );

    // For each order, fetch covered routes and eligible upcoming delivery runs
    const orders: UnscheduledOrderRecord[] = [];

    for (const row of dataRes.rows) {
      // Format awaiting time
      const mins = row.awaiting_minutes || 0;
      let timeFormatted = `${mins}m ago`;
      if (mins >= 1440) {
        timeFormatted = `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h ago`;
      } else if (mins >= 60) {
        timeFormatted = `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
      }

      // Fetch covered routes
      const routesRes = await query(
        `SELECT r.id, r.name, r.route_code
         FROM route_stops rs
         JOIN routes r ON rs.route_id = r.id
         WHERE rs.shop_id = $1 AND r.status IN ('ACTIVE', 'PUBLISHED') AND r.deleted_at IS NULL
         ORDER BY rs.stop_sequence ASC`,
        [row.shop_id]
      );
      const coveredRoutes = routesRes.rows;
      const coveredRouteIds = coveredRoutes.map((r) => r.id);

      // Fetch eligible runs on covered routes (from tomorrow up to 7 days ahead)
      let eligibleRuns: any[] = [];
      if (coveredRouteIds.length > 0) {
        const runsRes = await query(
          `SELECT dr.id, dr.run_code, dr.delivery_date, dr.route_id, dr.status, dr.is_published,
                  r.name as route_name,
                  u.name as driver_name,
                  v.registration_number as vehicle_registration, v.capacity_crates,
                  COALESCE(
                    (SELECT SUM(total_crates_count) FROM orders 
                     WHERE delivery_run_id = dr.id AND scheduling_status IN ('SCHEDULED', 'OUT_FOR_DELIVERY')),
                    0
                  )::numeric as assigned_crates
           FROM delivery_runs dr
           JOIN routes r ON dr.route_id = r.id
           JOIN users u ON dr.driver_id = u.id
           JOIN vehicles v ON dr.vehicle_id = v.id
           WHERE dr.route_id = ANY($1::uuid[])
             AND dr.delivery_date >= CURRENT_DATE
             AND dr.delivery_date <= (CURRENT_DATE + INTERVAL '7 days')
             AND dr.status NOT IN ('CANCELLED', 'COMPLETED')
             AND dr.deleted_at IS NULL
           ORDER BY dr.delivery_date ASC, dr.run_code ASC`,
          [coveredRouteIds]
        );

        eligibleRuns = runsRes.rows.map((r) => {
          const cap = Number(r.capacity_crates) || 80;
          const asg = Number(r.assigned_crates) || 0;
          return {
            id: r.id,
            runCode: r.run_code,
            deliveryDate: r.delivery_date,
            routeId: r.route_id,
            routeName: r.route_name,
            driverName: r.driver_name,
            vehicleRegistration: r.vehicle_registration,
            capacityCrates: cap,
            assignedCrates: asg,
            availableCrates: Math.max(0, cap - asg),
            status: r.status,
            isPublished: r.is_published,
          };
        });
      }

      // Generate items summary string
      const itemsList = row.items || [];
      const totalCrates = Number(row.total_crates_count) || 0;
      const totalLitres = Number(row.total_volume_litres) || 0;
      let summaryText = `${itemsList.length} line items`;
      if (totalCrates > 0) {
        summaryText = `${totalCrates} crates • ${totalLitres} L liquid (${itemsList.length} items)`;
      }

      orders.push({
        id: row.id,
        orderNumber: row.order_number,
        shopId: row.shop_id,
        shopName: row.shop_name,
        shopCode: row.shop_code || 'SH-NA',
        shopAddress: row.shop_address,
        shopPhone: row.shop_phone,
        shopArea: row.shop_area || '',
        shopCity: row.shop_city || '',
        createdAt: row.created_at,
        timeAwaitingMinutes: mins,
        timeAwaitingFormatted: timeFormatted,
        requestedDeliveryDate: row.requested_delivery_date,
        confirmedDeliveryDate: row.confirmed_delivery_date,
        deliveryWindow: row.delivery_window,
        schedulingStatus: row.scheduling_status,
        status: row.status,
        totalAmount: Number(row.total) || 0,
        totalCratesCount: totalCrates,
        totalVolumeLitres: totalLitres,
        totalPackagesCount: Number(row.total_packages_count) || 0,
        notes: row.notes,
        items: itemsList,
        itemsSummary: summaryText,
        coveredRoutes,
        eligibleRuns,
      });
    }

    return { orders, total };
  },

  /**
   * Schedule an order to a delivery run with capacity and conflict validation.
   */
  async scheduleOrder(params: {
    orderId: string;
    deliveryRunId: string;
    confirmedDate?: string;
    deliveryWindow?: string;
    adminId?: string;
    notes?: string;
  }): Promise<any> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and fetch order
      const orderRes = await client.query(
        `SELECT o.*, s.name as shop_name
         FROM orders o
         JOIN shops s ON o.shop_id = s.id
         WHERE o.id = $1
         FOR UPDATE`,
        [params.orderId]
      );

      if (!orderRes.rows[0]) {
        throw new AppError('Order not found', 404);
      }
      const order = orderRes.rows[0];

      if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
        throw new AppError(`Cannot schedule order in "${order.status}" status.`, 400);
      }

      // 2. Lock and fetch delivery run
      const runRes = await client.query(
        `SELECT dr.*, v.registration_number, v.capacity_crates, v.capacity_kg, v.status as vehicle_status,
                v.is_active as vehicle_is_active,
                u.name as driver_name, u.is_active as driver_is_active, u.license_expiry,
                r.name as route_name
         FROM delivery_runs dr
         JOIN vehicles v ON dr.vehicle_id = v.id
         JOIN users u ON dr.driver_id = u.id
         JOIN routes r ON dr.route_id = r.id
         WHERE dr.id = $1 AND dr.deleted_at IS NULL
         FOR UPDATE`,
        [params.deliveryRunId]
      );

      if (!runRes.rows[0]) {
        throw new AppError('Target delivery run not found', 404);
      }
      const run = runRes.rows[0];

      if (run.status === 'CANCELLED' || run.status === 'COMPLETED') {
        throw new AppError(`Cannot assign order to a delivery run that is ${run.status}.`, 409);
      }

      // Check vehicle and driver eligibility
      if (!run.driver_is_active) {
        throw new AppError(`Assigned driver ${run.driver_name} is currently inactive.`, 409);
      }
      if (!run.vehicle_is_active || run.vehicle_status === 'UNDER_MAINTENANCE') {
        throw new AppError(`Assigned vehicle ${run.registration_number} is unavailable (${run.vehicle_status}).`, 409);
      }

      // 3. Validate vehicle capacity
      const currentAssignedCratesRes = await client.query(
        `SELECT COALESCE(SUM(total_crates_count), 0)::numeric as current_crates
         FROM orders
         WHERE delivery_run_id = $1 AND id != $2 AND scheduling_status IN ('SCHEDULED', 'OUT_FOR_DELIVERY')`,
        [run.id, order.id]
      );
      const currentCrates = Number(currentAssignedCratesRes.rows[0]?.current_crates) || 0;
      const orderCrates = Number(order.total_crates_count) || 0;
      const maxCrates = Number(run.capacity_crates) || 80;

      if (currentCrates + orderCrates > maxCrates) {
        throw new AppError(
          `Vehicle crate capacity exceeded. Vehicle ${run.registration_number} holds max ${maxCrates} crates. Current assigned: ${currentCrates} crates. Adding ${orderCrates} crates would exceed capacity by ${(currentCrates + orderCrates - maxCrates).toFixed(1)} crates.`,
          409
        );
      }

      // 4. Ensure shop is included in run stops
      const runStopRes = await client.query(
        `SELECT id, stop_sequence FROM delivery_run_stops WHERE run_id = $1 AND shop_id = $2 LIMIT 1`,
        [run.id, order.shop_id]
      );

      let stopId: string | null = null;
      if (runStopRes.rows[0]) {
        stopId = runStopRes.rows[0].id;
      } else {
        // Find next stop sequence and insert stop
        const maxSeqRes = await client.query(
          `SELECT COALESCE(MAX(stop_sequence), 0)::int as max_seq FROM delivery_run_stops WHERE run_id = $1`,
          [run.id]
        );
        const nextSeq = (maxSeqRes.rows[0]?.max_seq || 0) + 1;

        const insertStopRes = await client.query(
          `INSERT INTO delivery_run_stops (run_id, shop_id, stop_sequence, status, notes)
           VALUES ($1, $2, $3, 'PENDING', $4)
           RETURNING id`,
          [run.id, order.shop_id, nextSeq, params.notes || 'Added via order scheduling assignment']
        );
        stopId = insertStopRes.rows[0].id;

        // Increment planned stops count on run
        await client.query(
          `UPDATE delivery_runs SET planned_stops_count = planned_stops_count + 1 WHERE id = $1`,
          [run.id]
        );
      }

      // 5. Update order record with confirmed date and run reference
      const confirmedDate = params.confirmedDate || run.delivery_date;
      const deliveryWindow = params.deliveryWindow || run.delivery_window || '06:00 AM - 09:00 AM';

      const prevStatus = order.scheduling_status;
      const prevDate = order.confirmed_delivery_date;
      const prevRunId = order.delivery_run_id;

      await client.query(
        `UPDATE orders
         SET delivery_run_id = $1,
             delivery_run_stop_id = $2,
             confirmed_delivery_date = $3::date,
             delivery_window = $4,
             scheduling_status = 'SCHEDULED',
             status = CASE WHEN status = 'PENDING' THEN 'CONFIRMED' ELSE status END,
             scheduled_at = NOW(),
             scheduled_by = $5,
             scheduling_notes = COALESCE($6, scheduling_notes),
             route_id = $7,
             updated_at = NOW()
         WHERE id = $8`,
        [
          run.id,
          stopId,
          confirmedDate,
          deliveryWindow,
          params.adminId || null,
          params.notes || null,
          run.route_id,
          order.id,
        ]
      );

      // 6. Update deliveries record to link driver
      await client.query(
        `INSERT INTO deliveries (order_id, driver_id, status, notes)
         VALUES ($1, $2, 'ASSIGNED', 'Scheduled to run ' || $3)
         ON CONFLICT (order_id)
         DO UPDATE SET driver_id = $2, status = 'ASSIGNED', updated_at = NOW()`,
        [order.id, run.driver_id, run.run_code]
      );

      // 7. Update delivery_runs rollups
      await client.query(
        `UPDATE delivery_runs
         SET total_assigned_crates = (
           SELECT COALESCE(SUM(total_crates_count), 0) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'
         ),
         total_assigned_orders_count = (
           SELECT COUNT(*) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'
         ),
         total_assigned_volume_litres = (
           SELECT COALESCE(SUM(total_volume_litres), 0) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [run.id]
      );

      // 8. Record in order_scheduling_history
      await client.query(
        `INSERT INTO order_scheduling_history (
           order_id, action, previous_delivery_date, new_delivery_date,
           previous_delivery_run_id, new_delivery_run_id, previous_status, new_status,
           reason, actor_id
         ) VALUES ($1, 'SCHEDULED', $2, $3::date, $4, $5, $6, 'SCHEDULED', $7, $8)`,
        [
          order.id,
          prevDate || null,
          confirmedDate,
          prevRunId || null,
          run.id,
          prevStatus,
          params.notes || `Assigned to delivery run ${run.run_code}`,
          params.adminId || null,
        ]
      );

      await client.query('COMMIT');
      logger.info(`[Scheduling] Order ${order.order_number} scheduled to run ${run.run_code} on ${confirmedDate}`);

      return {
        success: true,
        orderId: order.id,
        orderNumber: order.order_number,
        confirmedDeliveryDate: confirmedDate,
        deliveryWindow,
        schedulingStatus: 'SCHEDULED',
        deliveryRunId: run.id,
        runCode: run.run_code,
        driverName: run.driver_name,
        vehicleRegistration: run.registration_number,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Reschedule an order to another delivery run with full audit history.
   */
  async rescheduleOrder(params: {
    orderId: string;
    newDeliveryRunId: string;
    reason: string;
    adminId?: string;
    notes?: string;
  }): Promise<any> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      // 1. Lock and fetch current order
      const orderRes = await client.query(
        `SELECT * FROM orders WHERE id = $1 FOR UPDATE`,
        [params.orderId]
      );
      if (!orderRes.rows[0]) {
        throw new AppError('Order not found', 404);
      }
      const order = orderRes.rows[0];

      if (order.status === 'DELIVERED') {
        throw new AppError('Cannot reschedule an order that has already been delivered.', 400);
      }

      const prevRunId = order.delivery_run_id;
      const prevDate = order.confirmed_delivery_date;

      // 2. Fetch new delivery run
      const newRunRes = await client.query(
        `SELECT dr.*, v.registration_number, v.capacity_crates, u.name as driver_name
         FROM delivery_runs dr
         JOIN vehicles v ON dr.vehicle_id = v.id
         JOIN users u ON dr.driver_id = u.id
         WHERE dr.id = $1 AND dr.deleted_at IS NULL
         FOR UPDATE`,
        [params.newDeliveryRunId]
      );
      if (!newRunRes.rows[0]) {
        throw new AppError('Target delivery run not found', 404);
      }
      const newRun = newRunRes.rows[0];

      if (newRun.status === 'CANCELLED' || newRun.status === 'COMPLETED') {
        throw new AppError(`Cannot reschedule to a run that is ${newRun.status}.`, 409);
      }

      // Check capacity on new run
      const assignedOnNewRes = await client.query(
        `SELECT COALESCE(SUM(total_crates_count), 0)::numeric as current_crates
         FROM orders
         WHERE delivery_run_id = $1 AND id != $2 AND scheduling_status IN ('SCHEDULED', 'OUT_FOR_DELIVERY')`,
        [newRun.id, order.id]
      );
      const currentCrates = Number(assignedOnNewRes.rows[0]?.current_crates) || 0;
      const orderCrates = Number(order.total_crates_count) || 0;
      const maxCrates = Number(newRun.capacity_crates) || 80;

      if (currentCrates + orderCrates > maxCrates) {
        throw new AppError(
          `Target vehicle ${newRun.registration_number} capacity exceeded. Max: ${maxCrates}, current: ${currentCrates}, order: ${orderCrates}.`,
          409
        );
      }

      // 3. Ensure stop in new run
      let stopId: string | null = null;
      const stopCheck = await client.query(
        `SELECT id FROM delivery_run_stops WHERE run_id = $1 AND shop_id = $2 LIMIT 1`,
        [newRun.id, order.shop_id]
      );
      if (stopCheck.rows[0]) {
        stopId = stopCheck.rows[0].id;
      } else {
        const maxSeqRes = await client.query(
          `SELECT COALESCE(MAX(stop_sequence), 0)::int as max_seq FROM delivery_run_stops WHERE run_id = $1`,
          [newRun.id]
        );
        const nextSeq = (maxSeqRes.rows[0]?.max_seq || 0) + 1;
        const ins = await client.query(
          `INSERT INTO delivery_run_stops (run_id, shop_id, stop_sequence, status, notes)
           VALUES ($1, $2, $3, 'PENDING', $4)
           RETURNING id`,
          [newRun.id, order.shop_id, nextSeq, `Rescheduled: ${params.reason}`]
        );
        stopId = ins.rows[0].id;
        await client.query(
          `UPDATE delivery_runs SET planned_stops_count = planned_stops_count + 1 WHERE id = $1`,
          [newRun.id]
        );
      }

      // 4. Update order
      await client.query(
        `UPDATE orders
         SET delivery_run_id = $1,
             delivery_run_stop_id = $2,
             confirmed_delivery_date = $3::date,
             delivery_window = $4,
             route_id = $5,
             scheduled_by = $6,
             scheduling_notes = $7,
             updated_at = NOW()
         WHERE id = $8`,
        [
          newRun.id,
          stopId,
          newRun.delivery_date,
          newRun.delivery_window || order.delivery_window,
          newRun.route_id,
          params.adminId || null,
          `Rescheduled: ${params.reason}`,
          order.id,
        ]
      );

      // 5. Update deliveries record
      await client.query(
        `UPDATE deliveries
         SET driver_id = $1, status = 'ASSIGNED', notes = $2, updated_at = NOW()
         WHERE order_id = $3`,
        [newRun.driver_id, `Rescheduled to run ${newRun.run_code}: ${params.reason}`, order.id]
      );

      // 6. Record in audit history
      await client.query(
        `INSERT INTO order_scheduling_history (
           order_id, action, previous_delivery_date, new_delivery_date,
           previous_delivery_run_id, new_delivery_run_id, previous_status, new_status,
           reason, actor_id
         ) VALUES ($1, 'RESCHEDULED', $2, $3::date, $4, $5, $6, 'SCHEDULED', $7, $8)`,
        [
          order.id,
          prevDate || null,
          newRun.delivery_date,
          prevRunId || null,
          newRun.id,
          order.scheduling_status,
          params.reason,
          params.adminId || null,
        ]
      );

      // 7. Update rollups on both runs
      if (prevRunId) {
        await client.query(
          `UPDATE delivery_runs
           SET total_assigned_crates = (SELECT COALESCE(SUM(total_crates_count), 0) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'),
               total_assigned_orders_count = (SELECT COUNT(*) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'),
               updated_at = NOW()
           WHERE id = $1`,
          [prevRunId]
        );
      }

      await client.query(
        `UPDATE delivery_runs
         SET total_assigned_crates = (SELECT COALESCE(SUM(total_crates_count), 0) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'),
             total_assigned_orders_count = (SELECT COUNT(*) FROM orders WHERE delivery_run_id = $1 AND scheduling_status = 'SCHEDULED'),
             updated_at = NOW()
         WHERE id = $1`,
        [newRun.id]
      );

      await client.query('COMMIT');
      logger.info(`[Scheduling] Order ${order.order_number} rescheduled to ${newRun.run_code}`);

      return {
        success: true,
        orderId: order.id,
        newRunCode: newRun.run_code,
        confirmedDeliveryDate: newRun.delivery_date,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Publish a delivery run and confirm snapshot version.
   */
  async publishRun(runId: string, adminId?: string): Promise<any> {
    const client = await dbPool.connect();
    try {
      await client.query('BEGIN');

      const runRes = await client.query(
        `SELECT dr.*, r.id as route_id, r.name as route_name
         FROM delivery_runs dr
         JOIN routes r ON dr.route_id = r.id
         WHERE dr.id = $1 AND dr.deleted_at IS NULL
         FOR UPDATE`,
        [runId]
      );
      if (!runRes.rows[0]) {
        throw new AppError('Delivery run not found', 404);
      }
      const run = runRes.rows[0];

      // 1. Fetch current route stops snapshot
      const stopsRes = await client.query(
        `SELECT rs.shop_id, rs.stop_sequence, rs.planned_arrival_time, rs.delivery_instructions,
                s.name as shop_name, s.address as shop_address
         FROM route_stops rs
         JOIN shops s ON rs.shop_id = s.id
         WHERE rs.route_id = $1
         ORDER BY rs.stop_sequence ASC`,
        [run.route_id]
      );
      const snapshot = stopsRes.rows;

      // 2. Check if a route version already exists or create new version
      const maxVersionRes = await client.query(
        `SELECT COALESCE(MAX(version_number), 0)::int as max_ver FROM route_versions WHERE route_id = $1`,
        [run.route_id]
      );
      const nextVersion = (maxVersionRes.rows[0]?.max_ver || 0) + 1;

      const versionRes = await client.query(
        `INSERT INTO route_versions (route_id, version_number, stops_snapshot, changes_summary, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          run.route_id,
          nextVersion,
          JSON.stringify(snapshot),
          `Published snapshot for delivery run ${run.run_code} on ${run.delivery_date}`,
          adminId || null,
        ]
      );
      const routeVersionId = versionRes.rows[0].id;

      // 3. Mark delivery run as published and active
      await client.query(
        `UPDATE delivery_runs
         SET is_published = TRUE,
             published_at = NOW(),
             published_by = $1,
             route_version_id = $2,
             status = CASE WHEN status = 'DRAFT' THEN 'ASSIGNED' ELSE status END,
             updated_at = NOW()
         WHERE id = $3`,
        [adminId || null, routeVersionId, run.id]
      );

      // 4. Confirm delivery date on all orders linked to this run
      await client.query(
        `UPDATE orders
         SET confirmed_delivery_date = $1::date,
             scheduling_status = 'SCHEDULED',
             status = CASE WHEN status = 'PENDING' THEN 'CONFIRMED' ELSE status END,
             updated_at = NOW()
         WHERE delivery_run_id = $2 AND scheduling_status = 'AWAITING_SCHEDULING'`,
        [run.delivery_date, run.id]
      );

      await client.query('COMMIT');
      logger.info(`[Scheduling] Delivery run ${run.run_code} published with route version ${nextVersion}`);

      return {
        success: true,
        runId: run.id,
        runCode: run.run_code,
        deliveryDate: run.delivery_date,
        isPublished: true,
        routeVersionId,
        versionNumber: nextVersion,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * Get scheduling audit trail for an order.
   */
  async getOrderSchedulingHistory(orderId: string): Promise<any[]> {
    const res = await query(
      `SELECT osh.*,
              u.name as actor_name, u.email as actor_email,
              dr_prev.run_code as prev_run_code,
              dr_new.run_code as new_run_code
       FROM order_scheduling_history osh
       LEFT JOIN users u ON osh.actor_id = u.id
       LEFT JOIN delivery_runs dr_prev ON osh.previous_delivery_run_id = dr_prev.id
       LEFT JOIN delivery_runs dr_new ON osh.new_delivery_run_id = dr_new.id
       WHERE osh.order_id = $1
       ORDER BY osh.created_at DESC`,
      [orderId]
    );
    return res.rows;
  },
};
