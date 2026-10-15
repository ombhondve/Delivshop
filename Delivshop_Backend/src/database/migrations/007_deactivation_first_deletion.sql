-- Delivshop PostgreSQL Schema Migration 007
-- Deactivation-First Deletion, Soft Deletion, and Deletion Audit Columns

-- 1. Products Deletion Support
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);

-- 2. Companies Deletion Support
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);

-- 3. Shops Deletion Support
ALTER TABLE shops
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_deleted_at ON shops(deleted_at);

-- 4. Users / Drivers Deletion Support
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
