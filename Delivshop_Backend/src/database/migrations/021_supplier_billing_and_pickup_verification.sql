-- Delivshop PostgreSQL Schema Migration 021
-- Supplier Company Billing, Pickup Verification & Payment Records

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENHANCE COMPANIES TABLE WITH PAYMENT TERMS AND SETTLEMENT DETAILS
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) NOT NULL DEFAULT 'NET_15',
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50);

-- 2. ENHANCE DELIVERY_RUN_PICKUPS WITH SCHEDULING, VERIFICATION & BILLING TRACKING
ALTER TABLE delivery_run_pickups
    ALTER COLUMN run_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS pickup_reference VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS scheduled_date DATE,
    ADD COLUMN IF NOT EXISTS scheduled_time_window VARCHAR(50) DEFAULT '05:00 AM - 07:00 AM',
    ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS is_billed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bill_id UUID;

-- Update status constraint on delivery_run_pickups safely
DO $$
BEGIN
    -- Drop old status check if it exists
    ALTER TABLE delivery_run_pickups DROP CONSTRAINT IF EXISTS delivery_run_pickups_status_check;
    
    -- Add comprehensive status constraint
    ALTER TABLE delivery_run_pickups ADD CONSTRAINT chk_run_pickups_status
        CHECK (status IN (
            'PENDING', 'ARRIVED', 'COLLECTED', 'SHORTAGE', 'SKIPPED',
            'AWAITING_SCHEDULING', 'SCHEDULED', 'IN_PROGRESS', 
            'PARTIALLY_COLLECTED', 'PENDING_VERIFICATION', 'VERIFIED', 'CANCELLED'
        ));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Backfill pickup_reference if missing
UPDATE delivery_run_pickups
SET pickup_reference = 'PCK-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || SUBSTRING(id::text, 1, 6)
WHERE pickup_reference IS NULL;

-- 3. ENHANCE DELIVERY_RUN_PICKUP_ITEMS WITH SEPARATE QUANTITY BREAKDOWNS
ALTER TABLE delivery_run_pickup_items
    ADD COLUMN IF NOT EXISTS accepted_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (accepted_quantity >= 0),
    ADD COLUMN IF NOT EXISTS rejected_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (rejected_quantity >= 0),
    ADD COLUMN IF NOT EXISTS shortage_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (shortage_quantity >= 0),
    ADD COLUMN IF NOT EXISTS supplier_purchase_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (supplier_purchase_price >= 0),
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS verification_remarks TEXT,
    ADD COLUMN IF NOT EXISTS is_billed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS bill_item_id UUID;

-- Backfill default accepted_quantity and purchase_price from products
UPDATE delivery_run_pickup_items pi
SET accepted_quantity = pi.collected_quantity,
    supplier_purchase_price = COALESCE(p.purchase_cost, ROUND(p.price * 0.75, 2)),
    tax_rate = COALESCE(p.tax_rate, 0.00),
    line_total = ROUND(pi.collected_quantity * COALESCE(p.purchase_cost, ROUND(p.price * 0.75, 2)), 2)
FROM products p
WHERE p.id = pi.product_id AND pi.accepted_quantity = 0 AND pi.collected_quantity > 0;

-- 4. CREATE SUPPLIER BILLS TABLE
CREATE TABLE IF NOT EXISTS supplier_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number VARCHAR(50) NOT NULL UNIQUE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'FINALIZED' CHECK (status IN ('DRAFT', 'FINALIZED', 'CANCELLED')),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    adjustments_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    adjustment_reason TEXT,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (outstanding_balance >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREATE SUPPLIER BILL ITEMS TABLE
CREATE TABLE IF NOT EXISTS supplier_bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES supplier_bills(id) ON DELETE CASCADE,
    pickup_id UUID REFERENCES delivery_run_pickups(id) ON DELETE SET NULL,
    pickup_item_id UUID REFERENCES delivery_run_pickup_items(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'Unit',
    required_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    collected_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    accepted_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rejected_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shortage_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint from delivery_run_pickups(bill_id) to supplier_bills(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_pickups_supplier_bill'
    ) THEN
        ALTER TABLE delivery_run_pickups
            ADD CONSTRAINT fk_pickups_supplier_bill FOREIGN KEY (bill_id) REFERENCES supplier_bills(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. CREATE SUPPLIER PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    bill_id UUID NOT NULL REFERENCES supplier_bills(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER' CHECK (payment_method IN ('BANK_TRANSFER', 'NEFT', 'RTGS', 'UPI', 'CHEQUE', 'CASH', 'OTHER')),
    transaction_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ATOMIC BILLING & PAYMENT COUNTER TABLE
CREATE TABLE IF NOT EXISTS supplier_billing_counters (
    counter_type VARCHAR(50) PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 1000 CHECK (last_sequence >= 1000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO supplier_billing_counters (counter_type, last_sequence)
VALUES ('BILL', 1000), ('PAY', 1000), ('PCK', 1000)
ON CONFLICT (counter_type) DO NOTHING;

-- 8. PERFORMANCE & REPORTING INDEXES
CREATE INDEX IF NOT EXISTS idx_run_pickups_company_date ON delivery_run_pickups(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_run_pickups_is_billed ON delivery_run_pickups(company_id, is_billed);
CREATE INDEX IF NOT EXISTS idx_run_pickups_verification ON delivery_run_pickups(verified_at) WHERE verified_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pickup_items_is_billed ON delivery_run_pickup_items(pickup_id, is_billed);

CREATE INDEX IF NOT EXISTS idx_supplier_bills_company ON supplier_bills(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_status ON supplier_bills(status);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_payment_status ON supplier_bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_dates ON supplier_bills(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_supplier_bills_created_at ON supplier_bills(created_at);

CREATE INDEX IF NOT EXISTS idx_supplier_bill_items_bill ON supplier_bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_items_pickup ON supplier_bill_items(pickup_id);
CREATE INDEX IF NOT EXISTS idx_supplier_bill_items_product ON supplier_bill_items(product_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_bill ON supplier_payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_company ON supplier_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);
