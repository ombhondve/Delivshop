-- Delivshop PostgreSQL Schema Migration 005
-- Production Company Management, Counters, and Product Association

-- 1. Create Atomic Company Code Counter Table
CREATE TABLE IF NOT EXISTS company_code_counters (
    counter_prefix VARCHAR(20) PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 1000 CHECK (last_sequence >= 1000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize default counter prefix if not present
INSERT INTO company_code_counters (counter_prefix, last_sequence)
VALUES ('CMP', 1000)
ON CONFLICT (counter_prefix) DO NOTHING;

-- 2. Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    company_type VARCHAR(100) NOT NULL DEFAULT 'Dairy Processor',
    description TEXT,
    logo_url TEXT,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    alt_phone VARCHAR(50),
    gstin VARCHAR(20),
    pan VARCHAR(20),
    registration_number VARCHAR(100),
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Nashik',
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_company_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- 3. Associate Products with Companies (Backward-compatible foreign key)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 4. Create Performance & Search Indexes
CREATE INDEX IF NOT EXISTS idx_companies_company_code ON companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
