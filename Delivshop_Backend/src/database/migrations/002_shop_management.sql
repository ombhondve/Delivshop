-- Delivshop PostgreSQL Schema Migration 002
-- Production Shop Management, Atomic Shop ID Counters, Shop Accounts, Invoices, and Payments

-- 1. Extend user_role enum if needed (already contains 'ADMIN', 'SUPPLIER', 'SHOP', 'DRIVER')

-- 2. Create Atomic Shop ID Counter Table
CREATE TABLE IF NOT EXISTS shop_id_counters (
    counter_date DATE PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0 AND last_sequence <= 999),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enhance Shops Table with Enterprise Fields
ALTER TABLE shops 
    ADD COLUMN IF NOT EXISTS shop_id VARCHAR(15) UNIQUE,
    ADD COLUMN IF NOT EXISTS shop_type VARCHAR(50) DEFAULT 'Retail Shop',
    ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS area VARCHAR(255),
    ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Nashik',
    ADD COLUMN IF NOT EXISTS state VARCHAR(100) DEFAULT 'Maharashtra',
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS map_link TEXT,
    ADD COLUMN IF NOT EXISTS is_location_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS delivery_contact_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS delivery_contact_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
    ADD COLUMN IF NOT EXISTS delivery_window VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gstin VARCHAR(20),
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50) DEFAULT 'Advance Payment',
    ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Add constraints to shops table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shop_coordinates') THEN
        ALTER TABLE shops ADD CONSTRAINT chk_shop_coordinates 
            CHECK ((latitude IS NULL AND longitude IS NULL) OR 
                   (latitude BETWEEN -90.0 AND 90.0 AND longitude BETWEEN -180.0 AND 180.0));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shop_credit_limit') THEN
        ALTER TABLE shops ADD CONSTRAINT chk_shop_credit_limit 
            CHECK (credit_limit >= 0.00);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shop_status') THEN
        ALTER TABLE shops ADD CONSTRAINT chk_shop_status 
            CHECK (status IN ('ACTIVE', 'INACTIVE'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shop_payment_terms') THEN
        ALTER TABLE shops ADD CONSTRAINT chk_shop_payment_terms 
            CHECK (payment_terms IN ('Advance Payment', 'Credit Allowed'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_shop_type') THEN
        ALTER TABLE shops ADD CONSTRAINT chk_shop_type 
            CHECK (shop_type IN ('Retail Shop', 'Wholesale Shop', 'Distributor'));
    END IF;
END $$;

-- 4. Shop Accounts Table for Credentials & Security State
CREATE TABLE IF NOT EXISTS shop_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    temp_password_issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    setup_token_hash VARCHAR(255),
    setup_token_expires_at TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    due_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PAID', 'OVERDUE', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
    status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    transaction_ref VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shops_shop_id ON shops(shop_id);
CREATE INDEX IF NOT EXISTS idx_shops_status ON shops(status);
CREATE INDEX IF NOT EXISTS idx_shops_owner ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);
CREATE INDEX IF NOT EXISTS idx_shop_accounts_shop_id ON shop_accounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_invoices_shop_id ON invoices(shop_id);
CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON payments(shop_id);
