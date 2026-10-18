-- Delivshop PostgreSQL Schema Migration 018
-- Route-Based Delivery Scheduling, Operational Capacity, Runs Publishing & Unscheduled Orders Queue

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SUPPLIER SCHEDULING SETTINGS TABLE
CREATE TABLE IF NOT EXISTS supplier_scheduling_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operating_city VARCHAR(100) NOT NULL DEFAULT 'Pune',
    order_cutoff_time VARCHAR(10) NOT NULL DEFAULT '18:00',
    min_lead_days INTEGER NOT NULL DEFAULT 1 CHECK (min_lead_days >= 0),
    max_advance_booking_days INTEGER NOT NULL DEFAULT 7 CHECK (max_advance_booking_days >= 1),
    default_delivery_window VARCHAR(50) NOT NULL DEFAULT '06:00 AM - 09:00 AM',
    allow_ordering_without_published_run BOOLEAN NOT NULL DEFAULT TRUE,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    operating_days INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}',
    holidays DATE[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default supplier settings if empty
INSERT INTO supplier_scheduling_settings (
    operating_city, order_cutoff_time, min_lead_days, max_advance_booking_days,
    default_delivery_window, allow_ordering_without_published_run, timezone
)
SELECT 'Pune', '18:00', 1, 7, '06:00 AM - 09:00 AM', TRUE, 'Asia/Kolkata'
WHERE NOT EXISTS (SELECT 1 FROM supplier_scheduling_settings);

-- 2. ENHANCE DELIVERY_RUNS (Operational Daily Runs with Publishing & Snapshot Versioning)
ALTER TABLE delivery_runs
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS route_version_id UUID REFERENCES route_versions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_window VARCHAR(50) DEFAULT '06:00 AM - 09:00 AM',
    ADD COLUMN IF NOT EXISTS order_cutoff_time VARCHAR(20) DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS total_assigned_crates NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_assigned_volume_litres NUMERIC(10, 3) DEFAULT 0.000,
    ADD COLUMN IF NOT EXISTS total_assigned_orders_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_delivery_runs_is_published ON delivery_runs(is_published);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_published_schedule ON delivery_runs(delivery_date, is_published, status) WHERE deleted_at IS NULL;

-- 3. ENHANCE ORDERS (Requested vs Confirmed Delivery Dates & Scheduling Lifecycle)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS requested_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS confirmed_delivery_date DATE,
    ADD COLUMN IF NOT EXISTS delivery_window VARCHAR(50),
    ADD COLUMN IF NOT EXISTS scheduling_status VARCHAR(30) NOT NULL DEFAULT 'AWAITING_SCHEDULING',
    ADD COLUMN IF NOT EXISTS delivery_run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS delivery_run_stop_id UUID REFERENCES delivery_run_stops(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduling_notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_scheduling_status') THEN
        ALTER TABLE orders ADD CONSTRAINT chk_orders_scheduling_status
            CHECK (scheduling_status IN ('AWAITING_SCHEDULING', 'SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_scheduling_status ON orders(scheduling_status);
CREATE INDEX IF NOT EXISTS idx_orders_requested_date ON orders(requested_delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_date ON orders(confirmed_delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_run ON orders(delivery_run_id);

-- 4. ORDER SCHEDULING AUDIT & REASSIGNMENT HISTORY TABLE
CREATE TABLE IF NOT EXISTS order_scheduling_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    previous_delivery_date DATE,
    new_delivery_date DATE,
    previous_delivery_run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
    new_delivery_run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    reason TEXT,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_scheduling_hist_order ON order_scheduling_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_scheduling_hist_created ON order_scheduling_history(created_at DESC);

-- 5. BACKFILL EXISTING ORDERS CONSISTENTLY
UPDATE orders
SET scheduling_status = CASE
        WHEN status = 'DELIVERED' THEN 'DELIVERED'
        WHEN status = 'IN_TRANSIT' THEN 'OUT_FOR_DELIVERY'
        WHEN status = 'CANCELLED' THEN 'CANCELLED'
        WHEN status = 'CONFIRMED' THEN 'SCHEDULED'
        ELSE 'AWAITING_SCHEDULING'
    END,
    confirmed_delivery_date = CASE
        WHEN status = 'DELIVERED' THEN COALESCE(delivered_at::date, created_at::date)
        WHEN status = 'IN_TRANSIT' THEN CURRENT_DATE
        ELSE NULL
    END,
    requested_delivery_date = COALESCE(requested_delivery_date, (created_at + INTERVAL '1 day')::date)
WHERE requested_delivery_date IS NULL;
