-- Delivshop PostgreSQL Schema Migration 009
-- Enterprise Fleet, Vehicles, Vehicle Documents, Maintenance, Routes, Stops, Versions, Payroll, and Daily Delivery Assignments

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_code VARCHAR(50) NOT NULL UNIQUE,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    make_model VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(100) NOT NULL,
    capacity_kg NUMERIC(10, 2) NOT NULL DEFAULT 1000.00 CHECK (capacity_kg > 0),
    capacity_crates INTEGER NOT NULL DEFAULT 60 CHECK (capacity_crates >= 0),
    fuel_type VARCHAR(50) NOT NULL DEFAULT 'DIESEL' CHECK (fuel_type IN ('DIESEL', 'ELECTRIC', 'CNG', 'PETROL')),
    is_refrigerated BOOLEAN NOT NULL DEFAULT FALSE,
    city VARCHAR(100) NOT NULL DEFAULT 'Pune',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    depot VARCHAR(150) NOT NULL DEFAULT 'Pune Central Cold Depot',
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'UNDER_MAINTENANCE', 'INACTIVE')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    current_odometer_km INTEGER NOT NULL DEFAULT 0 CHECK (current_odometer_km >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deletion_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicles_registration ON vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_code ON vehicles(vehicle_code);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_city ON vehicles(city);
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON vehicles(deleted_at);

-- 2. VEHICLE DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS vehicle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('RC', 'INSURANCE', 'PUC', 'FITNESS', 'PERMIT')),
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (verification_status IN ('VALID', 'EXPIRING', 'EXPIRED', 'PENDING', 'REJECTED')),
    file_url TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vehicle_doc_type UNIQUE(vehicle_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_expiry ON vehicle_documents(expiry_date);

-- 3. VEHICLE MAINTENANCE TABLE
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service_type VARCHAR(100) NOT NULL,
    odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
    service_center VARCHAR(200),
    description TEXT,
    next_service_date DATE,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_maint_vehicle ON vehicle_maintenance(vehicle_id);

-- 4. DRIVER SALARY CONFIGURATIONS
CREATE TABLE IF NOT EXISTS driver_salary_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    base_monthly_salary NUMERIC(10, 2) NOT NULL DEFAULT 18000.00 CHECK (base_monthly_salary >= 0),
    daily_allowance NUMERIC(10, 2) NOT NULL DEFAULT 150.00 CHECK (daily_allowance >= 0),
    per_delivery_incentive NUMERIC(10, 2) NOT NULL DEFAULT 25.00 CHECK (per_delivery_incentive >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_salary_driver ON driver_salary_configs(driver_id);

-- 5. DRIVER PAYROLL RECORDS TABLE
CREATE TABLE IF NOT EXISTS driver_payroll_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_period VARCHAR(50) NOT NULL,
    base_salary NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (base_salary >= 0),
    allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (allowances >= 0),
    incentives NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (incentives >= 0),
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (deductions >= 0),
    advances NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (advances >= 0),
    net_amount NUMERIC(10, 2) NOT NULL CHECK (net_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PAID' CHECK (status IN ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED')),
    payment_date DATE,
    payment_reference VARCHAR(100),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_driver_payroll_period UNIQUE(driver_id, payment_period)
);

CREATE INDEX IF NOT EXISTS idx_driver_payroll_driver ON driver_payroll_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_payroll_period ON driver_payroll_records(payment_period);

-- 6. DRIVER DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('DRIVING_LICENSE', 'AADHAAR', 'PAN', 'POLICE_VERIFICATION', 'MEDICAL_FITNESS')),
    document_number VARCHAR(100) NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'VALID' CHECK (verification_status IN ('VALID', 'EXPIRING', 'EXPIRED', 'PENDING', 'REJECTED')),
    file_url TEXT,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_driver_doc_type UNIQUE(driver_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_expiry ON driver_documents(expiry_date);

-- 7. ROUTES TABLE
CREATE TABLE IF NOT EXISTS routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Pune',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    depot VARCHAR(150) NOT NULL DEFAULT 'Pune Central Cold Depot',
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE')),
    total_distance_km NUMERIC(8, 2) DEFAULT 0.00 CHECK (total_distance_km >= 0),
    estimated_duration_minutes INTEGER DEFAULT 0 CHECK (estimated_duration_minutes >= 0),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deletion_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_routes_code ON routes(route_code);
CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

-- 8. ROUTE STOPS TABLE (Sequenced Delivery Stops referencing existing Shops)
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    stop_sequence INTEGER NOT NULL CHECK (stop_sequence > 0),
    planned_arrival_time VARCHAR(20),
    service_time_minutes INTEGER NOT NULL DEFAULT 10 CHECK (service_time_minutes >= 0),
    delivery_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_stop_sequence UNIQUE(route_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_shop ON route_stops(shop_id);

-- 9. ROUTE VERSIONS TABLE (Immutable snapshot of route templates for dispatched runs audit)
CREATE TABLE IF NOT EXISTS route_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number >= 1),
    stops_snapshot JSONB NOT NULL,
    changes_summary TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_route_version UNIQUE(route_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_route_versions_route ON route_versions(route_id);

-- 10. DELIVERY RUNS TABLE (Operational Daily Assignments)
CREATE TABLE IF NOT EXISTS delivery_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code VARCHAR(50) NOT NULL UNIQUE,
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    delivery_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('DRAFT', 'VALIDATED', 'ASSIGNED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    planned_stops_count INTEGER NOT NULL DEFAULT 0 CHECK (planned_stops_count >= 0),
    completed_stops_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_stops_count >= 0),
    dispatch_time TIMESTAMPTZ,
    completion_time TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_driver_run_date UNIQUE(driver_id, delivery_date),
    CONSTRAINT uq_vehicle_run_date UNIQUE(vehicle_id, delivery_date)
);

CREATE INDEX IF NOT EXISTS idx_delivery_runs_date ON delivery_runs(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_driver ON delivery_runs(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_vehicle ON delivery_runs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_route ON delivery_runs(route_id);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_status ON delivery_runs(status);

-- 11. DELIVERY RUN STOPS TABLE (Execution snapshot per run)
CREATE TABLE IF NOT EXISTS delivery_run_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES delivery_runs(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    stop_sequence INTEGER NOT NULL CHECK (stop_sequence > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ARRIVED', 'DELIVERED', 'FAILED', 'SKIPPED')),
    arrival_time TIMESTAMPTZ,
    delivery_time TIMESTAMPTZ,
    notes TEXT,
    proof_of_delivery_url TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_stop_sequence UNIQUE(run_id, stop_sequence)
);

CREATE INDEX IF NOT EXISTS idx_run_stops_run ON delivery_run_stops(run_id);
CREATE INDEX IF NOT EXISTS idx_run_stops_shop ON delivery_run_stops(shop_id);

-- 12. SEED INITIAL FLEET VEHICLES, DOCUMENTS & SAMPLE ROUTES
DO $$
DECLARE
    v1_id UUID;
    v2_id UUID;
    v3_id UUID;
    v4_id UUID;
    v5_id UUID;
    r1_id UUID;
    r2_id UUID;
    s1_id UUID;
    s2_id UUID;
    s3_id UUID;
    drv1_id UUID;
    drv2_id UUID;
BEGIN
    -- Seed Vehicles if empty
    IF NOT EXISTS (SELECT 1 FROM vehicles LIMIT 1) THEN
        INSERT INTO vehicles (id, vehicle_code, registration_number, make_model, vehicle_type, capacity_kg, capacity_crates, fuel_type, is_refrigerated, city, state, depot, status, is_active, current_odometer_km, notes)
        VALUES
        (gen_random_uuid(), 'VEH-1001', 'MH-12-DV-4421', 'Tata Ace Gold EV', 'Refrigerated Van (1.5 Ton)', 1500.00, 80, 'ELECTRIC', TRUE, 'Pune', 'Maharashtra', 'Pune Central Cold Depot', 'ASSIGNED', TRUE, 14250, 'Equipped with digital temperature data-logger'),
        (gen_random_uuid(), 'VEH-1002', 'MH-12-DV-8812', 'Mahindra Bolero Maxi Truck Plus', 'Insulated Delivery Van', 1800.00, 95, 'DIESEL', FALSE, 'Pune', 'Maharashtra', 'Kothrud Regional Distribution Point', 'AVAILABLE', TRUE, 38400, 'Regular city crate distribution'),
        (gen_random_uuid(), 'VEH-1003', 'MH-14-BT-3109', 'Ashok Leyland Dost+ Commercial', 'Refrigerated Milk Tanker', 2500.00, 140, 'DIESEL', TRUE, 'Pune', 'Maharashtra', 'Hadapsar Bulk Wholesale Facility', 'AVAILABLE', TRUE, 51200, 'Heavy milk bulk transfer vehicle'),
        (gen_random_uuid(), 'VEH-1004', 'MH-12-DV-9901', 'Mahindra Treo Zor EV', 'Electric Cargo Van', 650.00, 35, 'ELECTRIC', FALSE, 'Pune', 'Maharashtra', 'Viman Nagar Hub', 'UNDER_MAINTENANCE', TRUE, 9150, 'Quarterly brake caliper overhaul'),
        (gen_random_uuid(), 'VEH-1005', 'MH-12-DV-1234', 'Tata 407 LPT Chiller', 'Refrigerated Van (1.5 Ton)', 2200.00, 110, 'DIESEL', TRUE, 'Pune', 'Maharashtra', 'Aundh Regional Center', 'INACTIVE', FALSE, 78900, 'Decommissioned pending auction');

        -- Seed Documents for VEH-1001
        SELECT id INTO v1_id FROM vehicles WHERE vehicle_code = 'VEH-1001';
        IF v1_id IS NOT NULL THEN
            INSERT INTO vehicle_documents (vehicle_id, document_type, document_number, issue_date, expiry_date, verification_status, notes)
            VALUES
            (v1_id, 'RC', 'RC-MH12-2023-88712', '2023-01-15', '2038-01-14', 'VALID', 'Permanent RC verified by RTO Pune'),
            (v1_id, 'INSURANCE', 'INS-HDFC-9918231', '2026-01-01', '2027-01-01', 'VALID', 'Comprehensive commercial insurance policy with refrigeration rider'),
            (v1_id, 'PUC', 'PUC-MH12-2026-0034', '2026-06-01', '2026-12-01', 'VALID', 'Zero EV emission compliance certificate'),
            (v1_id, 'FITNESS', 'FIT-RTO-2024-9128', '2024-01-15', '2026-11-20', 'EXPIRING', 'Mandatory 2-year commercial vehicle inspection renewal due');

            INSERT INTO vehicle_maintenance (vehicle_id, service_date, service_type, odometer_km, cost, service_center, description, next_service_date)
            VALUES
            (v1_id, CURRENT_DATE - INTERVAL '45 days', 'Scheduled 10K EV Service', 10100, 4200.00, 'Tata Motors Authorized Commercial Workshop, Swargate', 'Battery coolant flush, motor telemetry calibration, tyre rotation', CURRENT_DATE + INTERVAL '135 days');
        END IF;

        -- Seed Documents for VEH-1002
        SELECT id INTO v2_id FROM vehicles WHERE vehicle_code = 'VEH-1002';
        IF v2_id IS NOT NULL THEN
            INSERT INTO vehicle_documents (vehicle_id, document_type, document_number, issue_date, expiry_date, verification_status, notes)
            VALUES
            (v2_id, 'RC', 'RC-MH12-2021-44129', '2021-04-10', '2036-04-09', 'VALID', 'Valid commercial vehicle RC'),
            (v2_id, 'INSURANCE', 'INS-ICICI-1102938', '2025-09-01', '2026-09-01', 'EXPIRED', 'Annual renewal pending with accounts department'),
            (v2_id, 'PUC', 'PUC-MH12-2026-8871', '2026-08-01', '2027-02-01', 'VALID', 'BS-VI diesel emission test passed');
        END IF;
    END IF;

    -- Seed Driver Payroll, Salary Configs & Driver Documents for existing drivers
    FOR drv1_id IN (SELECT id FROM users WHERE role = 'DRIVER' LIMIT 5) LOOP
        -- Seed Salary Config
        IF NOT EXISTS (SELECT 1 FROM driver_salary_configs WHERE driver_id = drv1_id) THEN
            INSERT INTO driver_salary_configs (driver_id, base_monthly_salary, daily_allowance, per_delivery_incentive, effective_from, is_current, notes)
            VALUES (drv1_id, 19500.00, 150.00, 30.00, '2026-01-01', TRUE, 'Standard certified logistics personnel scale');
        END IF;

        -- Seed Historical Payroll Record
        IF NOT EXISTS (SELECT 1 FROM driver_payroll_records WHERE driver_id = drv1_id AND payment_period = '2026-09') THEN
            INSERT INTO driver_payroll_records (driver_id, payment_period, base_salary, allowances, incentives, deductions, advances, net_amount, status, payment_date, payment_reference, notes)
            VALUES (drv1_id, '2026-09', 19500.00, 3900.00, 1850.00, 500.00, 0.00, 24750.00, 'PAID', '2026-10-02', 'NEFT-DLV-882190', 'September 2026 full monthly settlement');
        END IF;

        -- Seed Driving License Doc
        IF NOT EXISTS (SELECT 1 FROM driver_documents WHERE driver_id = drv1_id AND document_type = 'DRIVING_LICENSE') THEN
            INSERT INTO driver_documents (driver_id, document_type, document_number, issue_date, expiry_date, verification_status, notes)
            VALUES (drv1_id, 'DRIVING_LICENSE', 'MH-12-DL-2018-09124', '2018-05-10', '2028-05-09', 'VALID', 'Commercial Heavy Transport Driving License verified by HR');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM driver_documents WHERE driver_id = drv1_id AND document_type = 'AADHAAR') THEN
            INSERT INTO driver_documents (driver_id, document_type, document_number, verification_status, notes)
            VALUES (drv1_id, 'AADHAAR', 'XXXXXXXX4891', 'VALID', 'UIDAI biometric validation confirmed on file');
        END IF;
    END LOOP;

    -- Seed Master Routes if none exist
    IF NOT EXISTS (SELECT 1 FROM routes LIMIT 1) THEN
        INSERT INTO routes (id, route_code, name, city, state, depot, description, status, total_distance_km, estimated_duration_minutes, version)
        VALUES
        (gen_random_uuid(), 'RT-PUN-01', 'Route 1 • Central & Camp Morning Dairy Run', 'Pune', 'Maharashtra', 'Pune Central Cold Depot', 'High-density morning distribution covering Camp, MG Road, and Shivaji Nagar commercial retail hubs.', 'ACTIVE', 28.50, 135, 1),
        (gen_random_uuid(), 'RT-PUN-02', 'Route 2 • Kothrud & Karve Road Express', 'Pune', 'Maharashtra', 'Pune Central Cold Depot', 'Residential and grocery retail store route serving western Pune.', 'ACTIVE', 32.00, 150, 1),
        (gen_random_uuid(), 'RT-PUN-03', 'Route 3 • Hadapsar Wholesale Hub & Magarpatta', 'Pune', 'Maharashtra', 'Hadapsar Bulk Wholesale Facility', 'Wholesale dairy distribution corridor with large crate volume.', 'ACTIVE', 41.20, 180, 1),
        (gen_random_uuid(), 'RT-PUN-04', 'Route 4 • Viman Nagar & Kalyani Nagar Line', 'Pune', 'Maharashtra', 'Pune Central Cold Depot', 'Eastern city run connecting premium retail milk distribution points.', 'DRAFT', 24.80, 110, 1);

        -- Attach stops to Route 1 from existing shops
        SELECT id INTO r1_id FROM routes WHERE route_code = 'RT-PUN-01';
        IF r1_id IS NOT NULL THEN
            -- Find first 3 shops
            SELECT id INTO s1_id FROM shops ORDER BY name ASC LIMIT 1;
            SELECT id INTO s2_id FROM shops ORDER BY name ASC OFFSET 1 LIMIT 1;
            SELECT id INTO s3_id FROM shops ORDER BY name ASC OFFSET 2 LIMIT 1;

            IF s1_id IS NOT NULL THEN
                INSERT INTO route_stops (route_id, shop_id, stop_sequence, planned_arrival_time, service_time_minutes, delivery_instructions)
                VALUES (r1_id, s1_id, 1, '06:00 AM', 12, 'Unload via back alley milk crate bay. Require shopkeeper signature.');
            END IF;
            IF s2_id IS NOT NULL THEN
                INSERT INTO route_stops (route_id, shop_id, stop_sequence, planned_arrival_time, service_time_minutes, delivery_instructions)
                VALUES (r1_id, s2_id, 2, '06:30 AM', 10, 'Handover insulated pouches directly into front chiller unit.');
            END IF;
            IF s3_id IS NOT NULL THEN
                INSERT INTO route_stops (route_id, shop_id, stop_sequence, planned_arrival_time, service_time_minutes, delivery_instructions)
                VALUES (r1_id, s3_id, 3, '07:00 AM', 15, 'Collect previous day empty dairy crates (approx 20 crates).');
            END IF;

            -- Create Route 1 Version snapshot
            INSERT INTO route_versions (route_id, version_number, stops_snapshot, changes_summary)
            VALUES (r1_id, 1, json_build_array(
                json_build_object('sequence', 1, 'shop_id', s1_id, 'arrival', '06:00 AM'),
                json_build_object('sequence', 2, 'shop_id', s2_id, 'arrival', '06:30 AM'),
                json_build_object('sequence', 3, 'shop_id', s3_id, 'arrival', '07:00 AM')
            ), 'Initial verified operational route layout');
        END IF;

        -- Create sample Delivery Run for today if route, driver, and vehicle are available
        SELECT id INTO drv1_id FROM users WHERE role = 'DRIVER' AND is_active = TRUE AND deleted_at IS NULL LIMIT 1;
        SELECT id INTO v1_id FROM vehicles WHERE status = 'ASSIGNED' AND is_active = TRUE LIMIT 1;
        IF r1_id IS NOT NULL AND drv1_id IS NOT NULL AND v1_id IS NOT NULL THEN
            IF NOT EXISTS (SELECT 1 FROM delivery_runs WHERE delivery_date = CURRENT_DATE) THEN
                INSERT INTO delivery_runs (run_code, route_id, driver_id, vehicle_id, delivery_date, status, planned_stops_count, completed_stops_count, dispatch_time, notes)
                VALUES
                (CONCAT('RUN-', TO_CHAR(CURRENT_DATE, 'YYYYMMDD'), '-01'), r1_id, drv1_id, v1_id, CURRENT_DATE, 'IN_PROGRESS', 3, 1, NOW() - INTERVAL '2 hours', 'Morning peak run. Vehicle temperature logged steady at 4°C.');
            END IF;
        END IF;
    END IF;
END $$;
