-- Delivshop PostgreSQL Schema Migration 015
-- Driver App Enterprise Enhancements: Vehicle Inspections, Driver Incidents, and Delivery Completion Auditing

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. VEHICLE PRE-DISPATCH INSPECTIONS TABLE
CREATE TABLE IF NOT EXISTS vehicle_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_code VARCHAR(50) NOT NULL UNIQUE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
    odometer_km INTEGER NOT NULL CHECK (odometer_km >= 0),
    fuel_level_percent INTEGER CHECK (fuel_level_percent >= 0 AND fuel_level_percent <= 100),
    refrigeration_temp_c NUMERIC(4, 1),
    is_tyres_ok BOOLEAN NOT NULL DEFAULT TRUE,
    is_lights_ok BOOLEAN NOT NULL DEFAULT TRUE,
    is_body_ok BOOLEAN NOT NULL DEFAULT TRUE,
    is_refrigeration_ok BOOLEAN NOT NULL DEFAULT TRUE,
    is_safety_kit_ok BOOLEAN NOT NULL DEFAULT TRUE,
    is_docs_valid BOOLEAN NOT NULL DEFAULT TRUE,
    passed BOOLEAN NOT NULL DEFAULT TRUE,
    defects_reported TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_driver ON vehicle_inspections(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_run ON vehicle_inspections(run_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_created_at ON vehicle_inspections(created_at);

-- 2. DRIVER INCIDENTS & DELIVERY EXCEPTIONS TABLE
CREATE TABLE IF NOT EXISTS driver_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number VARCHAR(50) NOT NULL UNIQUE,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
    stop_id UUID REFERENCES delivery_run_stops(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'SHOP_CLOSED',
        'DELIVERY_REFUSED',
        'PARTIAL_DELIVERY',
        'DAMAGED_PRODUCTS',
        'MISSING_STOCK',
        'VEHICLE_BREAKDOWN',
        'ROUTE_OBSTRUCTION',
        'PAYMENT_DISCREPANCY',
        'SAFETY_INCIDENT',
        'OTHER'
    )),
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    evidence_url TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    status VARCHAR(50) NOT NULL DEFAULT 'REPORTED' CHECK (status IN ('REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED')),
    resolution_notes TEXT,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_incidents_driver ON driver_incidents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_run ON driver_incidents(run_id);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_shop ON driver_incidents(shop_id);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_status ON driver_incidents(status);
CREATE INDEX IF NOT EXISTS idx_driver_incidents_created_at ON driver_incidents(created_at);

-- 3. ENHANCE DELIVERIES TABLE FOR POD & ITEM DETAILS
ALTER TABLE deliveries
    ADD COLUMN IF NOT EXISTS proof_of_delivery_url TEXT,
    ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS signature_url TEXT,
    ADD COLUMN IF NOT EXISTS delivered_crates_count INTEGER DEFAULT 0 CHECK (delivered_crates_count >= 0),
    ADD COLUMN IF NOT EXISTS returned_crates_count INTEGER DEFAULT 0 CHECK (returned_crates_count >= 0),
    ADD COLUMN IF NOT EXISTS shortage_reason TEXT,
    ADD COLUMN IF NOT EXISTS collected_amount NUMERIC(12, 2) DEFAULT 0.00 CHECK (collected_amount >= 0),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'CASH';

-- 4. DELIVERY RUN RECONCILIATIONS TABLE
CREATE TABLE IF NOT EXISTS delivery_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reconciliation_code VARCHAR(50) NOT NULL UNIQUE,
    run_id UUID NOT NULL REFERENCES delivery_runs(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    total_stops_planned INTEGER NOT NULL DEFAULT 0,
    total_stops_completed INTEGER NOT NULL DEFAULT 0,
    total_stops_failed INTEGER NOT NULL DEFAULT 0,
    total_crates_dispatched INTEGER NOT NULL DEFAULT 0,
    total_crates_delivered INTEGER NOT NULL DEFAULT 0,
    total_crates_returned INTEGER NOT NULL DEFAULT 0,
    total_cash_expected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_cash_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_upi_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount_deposited NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    variance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'VERIFIED', 'DISCREPANCY_FLAGGED', 'APPROVED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliv_reconciliation_run ON delivery_reconciliations(run_id);
CREATE INDEX IF NOT EXISTS idx_deliv_reconciliation_driver ON delivery_reconciliations(driver_id);
