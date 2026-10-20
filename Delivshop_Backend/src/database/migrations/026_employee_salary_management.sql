-- ============================================================================
-- DELIVSHOP MIGRATION 026: EMPLOYEE SALARY MANAGEMENT & PAYMENT TRANSACTIONS
-- 1. Enhances driver/employee salary configs for historical revision tracking.
-- 2. Introduces driver_salary_payments table for traceable financial transactions,
--    multi-payment tracking, partial payments, and audit-logged reversals.
-- ============================================================================

-- 1. Ensure driver_salary_configs supports flexible salary types and dates
DO $$
BEGIN
    -- Drop constraint if exists to expand salary_type to support 'Fixed Monthly Salary'
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'driver_salary_configs_salary_type_check'
        AND conrelid = 'driver_salary_configs'::regclass
    ) THEN
        ALTER TABLE driver_salary_configs DROP CONSTRAINT driver_salary_configs_salary_type_check;
    END IF;

    -- Add check constraint supporting standard and flexible labels
    ALTER TABLE driver_salary_configs ADD CONSTRAINT driver_salary_configs_salary_type_check
        CHECK (salary_type IN (
            'Fixed Monthly Salary', 'FIXED_MONTHLY', 'MONTHLY',
            'DAILY', 'WEEKLY', 'BIWEEKLY', 'PER_DELIVERY'
        ));
END $$;

ALTER TABLE driver_salary_configs
    ALTER COLUMN base_monthly_salary SET DEFAULT 0.00,
    ALTER COLUMN daily_allowance SET DEFAULT 0.00,
    ALTER COLUMN per_delivery_incentive SET DEFAULT 0.00;

-- 2. CREATE TABLE driver_salary_payments
CREATE TABLE IF NOT EXISTS driver_salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    salary_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'UPI', 'CASH')),
    transaction_reference VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REVERSED')),
    reversal_reason TEXT,
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance & indexing
CREATE INDEX IF NOT EXISTS idx_salary_payments_driver_month ON driver_salary_payments(driver_id, salary_month);
CREATE INDEX IF NOT EXISTS idx_salary_payments_status ON driver_salary_payments(status);
CREATE INDEX IF NOT EXISTS idx_salary_payments_ref ON driver_salary_payments(transaction_reference) WHERE transaction_reference IS NOT NULL;
