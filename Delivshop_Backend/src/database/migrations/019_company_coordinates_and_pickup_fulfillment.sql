-- Delivshop PostgreSQL Schema Migration 019
-- Company GPS Coordinates, Delivery Run Pickups & Supplier Fulfillment

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADD GPS COORDINATES TO COMPANIES TABLE
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'chk_companies_coordinates' 
        AND conrelid = 'companies'::regclass
    ) THEN
        ALTER TABLE companies ADD CONSTRAINT chk_companies_coordinates
            CHECK (
                (latitude IS NULL AND longitude IS NULL) OR 
                (latitude BETWEEN -90.0 AND 90.0 AND longitude BETWEEN -180.0 AND 180.0)
            );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_companies_coordinates ON companies(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 2. BACKFILL INITIAL GPS COORDINATES FOR SEED COMPANIES (Ozar / Nashik Regional Facility)
UPDATE companies
SET latitude = 20.0911000,
    longitude = 73.9168000
WHERE company_code = 'CMP-1005' AND (latitude IS NULL OR longitude IS NULL);

-- 3. CREATE DELIVERY RUN PICKUPS TABLE (Supplier Pickup Stops per Delivery Run)
CREATE TABLE IF NOT EXISTS delivery_run_pickups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES delivery_runs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    stop_sequence INTEGER NOT NULL DEFAULT 1 CHECK (stop_sequence > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ARRIVED', 'COLLECTED', 'SHORTAGE', 'SKIPPED')),
    arrival_time TIMESTAMPTZ,
    completed_time TIMESTAMPTZ,
    verified_latitude NUMERIC(10, 7),
    verified_longitude NUMERIC(10, 7),
    verified_distance_meters NUMERIC(10, 2),
    discrepancy_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_run_company_pickup UNIQUE(run_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_run_pickups_run ON delivery_run_pickups(run_id);
CREATE INDEX IF NOT EXISTS idx_run_pickups_company ON delivery_run_pickups(company_id);
CREATE INDEX IF NOT EXISTS idx_run_pickups_status ON delivery_run_pickups(status);

-- 4. CREATE DELIVERY RUN PICKUP ITEMS TABLE (Required vs Collected Quantities per Product)
CREATE TABLE IF NOT EXISTS delivery_run_pickup_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_id UUID NOT NULL REFERENCES delivery_run_pickups(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    required_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (required_quantity >= 0),
    collected_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (collected_quantity >= 0),
    unit VARCHAR(50) NOT NULL DEFAULT 'Unit',
    shortage_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pickup_product UNIQUE(pickup_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_pickup_items_pickup ON delivery_run_pickup_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_pickup_items_product ON delivery_run_pickup_items(product_id);
