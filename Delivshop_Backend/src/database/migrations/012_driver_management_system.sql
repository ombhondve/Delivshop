-- ============================================================================
-- DELIVSHOP MIGRATION 012: COMPREHENSIVE DRIVER MANAGEMENT & ATTENDANCE SYSTEM
-- Adds attendance tracking, atomic employee ID counters, collections ledger,
-- and enhanced driver personal & compliance fields.
-- ============================================================================

-- 1. ENHANCE USERS TABLE FOR DRIVER PROFILES
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Pune',
    ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Maharashtra',
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS emergency_contact_relation VARCHAR(50),
    ADD COLUMN IF NOT EXISTS license_class VARCHAR(50) DEFAULT 'LMV-TR (Transport)',
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE', 'ON_LEAVE', 'PROBATION', 'SUSPENDED', 'TERMINATED', 'RESIGNED')),
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'PENDING_ACTIVATION', 'SUSPENDED', 'DEACTIVATED'));

-- 2. DRIVER EMPLOYEE ID CONCURRENCY COUNTER TABLE
CREATE TABLE IF NOT EXISTS driver_employee_id_counters (
    counter_prefix VARCHAR(50) PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 1000 CHECK (last_sequence >= 1000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial employee ID counter based on existing drivers
INSERT INTO driver_employee_id_counters (counter_prefix, last_sequence, updated_at)
VALUES (
    'EMP-DRV',
    COALESCE(
        (SELECT MAX(NULLIF(SUBSTRING(employee_id FROM 9), '')::int) FROM users WHERE role = 'DRIVER' AND employee_id ~ '^EMP-DRV-\d+$'),
        1005
    ),
    NOW()
)
ON CONFLICT (counter_prefix) DO NOTHING;

-- 3. DRIVER ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS driver_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'ON_LEAVE', 'HALF_DAY')),
    is_late BOOLEAN NOT NULL DEFAULT FALSE,
    check_in_latitude NUMERIC(10, 7),
    check_in_longitude NUMERIC(10, 7),
    check_out_latitude NUMERIC(10, 7),
    check_out_longitude NUMERIC(10, 7),
    notes TEXT,
    correction_reason TEXT,
    corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_driver_attendance_date UNIQUE(driver_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_driver_attendance_date ON driver_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_driver ON driver_attendance(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_attendance_status ON driver_attendance(status);

-- 4. UPDATE DELIVERY RUNS STATUS CHECK TO SUPPORT GRANULAR STATE MACHINE
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'delivery_runs_status_check' 
        AND conrelid = 'delivery_runs'::regclass
    ) THEN
        ALTER TABLE delivery_runs DROP CONSTRAINT delivery_runs_status_check;
    END IF;

    ALTER TABLE delivery_runs ADD CONSTRAINT delivery_runs_status_check 
        CHECK (status IN (
            'DRAFT', 'VALIDATED', 'ASSIGNED', 'READY', 
            'TO_PICKUP', 'ARRIVED_PICKUP', 'LOADING', 'LOADED', 
            'DELIVERY_READY', 'IN_DELIVERY', 'IN_PROGRESS', 
            'RETURNING_HOME', 'RECONCILIATION', 'COMPLETED', 
            'CANCELLED', 'PAUSED', 'NEEDS_REVIEW'
        ));
END $$;

-- 5. ENHANCE DELIVERY RUN STOPS FOR DISCREPANCIES, RETURNS & OTP
ALTER TABLE delivery_run_stops
    ADD COLUMN IF NOT EXISTS delivered_crates_count INT DEFAULT 0 CHECK (delivered_crates_count >= 0),
    ADD COLUMN IF NOT EXISTS returned_crates_count INT DEFAULT 0 CHECK (returned_crates_count >= 0),
    ADD COLUMN IF NOT EXISTS shortage_reason TEXT,
    ADD COLUMN IF NOT EXISTS collected_amount NUMERIC(10, 2) DEFAULT 0.00 CHECK (collected_amount >= 0),
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'CASH',
    ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS otp_verified_at TIMESTAMPTZ;

-- 6. DELIVERY COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS delivery_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    run_id UUID NOT NULL REFERENCES delivery_runs(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER')),
    transaction_reference VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'COLLECTED' CHECK (status IN ('COLLECTED', 'RECONCILED', 'DEPOSITED', 'DISPUTED')),
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliv_collections_run ON delivery_collections(run_id);
CREATE INDEX IF NOT EXISTS idx_deliv_collections_shop ON delivery_collections(shop_id);
CREATE INDEX IF NOT EXISTS idx_deliv_collections_driver ON delivery_collections(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliv_collections_date ON delivery_collections(collected_at);
