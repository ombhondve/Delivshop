-- Delivshop PostgreSQL Schema Migration 022
-- Transition from Warehouse Inventory to Direct Supplier-to-Shop Distribution System
-- Preserves all existing historical records, products, companies, orders, pickups, deliveries, bills, and payments.

-- 1. RETIRE WAREHOUSE STOCK DEPENDENCIES ON PRODUCTS TABLE
-- Modify stock-related columns to be fully optional with non-blocking defaults.
-- Delivshop follows a direct supplier-to-shop fulfillment model:
-- products are sourced from assigned supplier companies on demand for scheduled delivery runs.
ALTER TABLE products
    ALTER COLUMN stock_quantity SET DEFAULT 0,
    ALTER COLUMN track_inventory SET DEFAULT false,
    ALTER COLUMN track_batches SET DEFAULT false,
    ALTER COLUMN min_stock_threshold DROP NOT NULL,
    ALTER COLUMN reorder_quantity DROP NOT NULL;

-- 2. ADD CATALOG & DIRECT-FULFILLMENT METADATA
COMMENT ON COLUMN products.stock_quantity IS 'DEPRECATED: Delivshop operates on a direct supplier-to-shop distribution model. Warehouse stock balance is retired.';
COMMENT ON COLUMN products.track_inventory IS 'DEPRECATED: Warehouse stock tracking retired. Product orderability is determined by is_active and supplier availability.';
COMMENT ON COLUMN products.track_batches IS 'DEPRECATED: Warehouse batch tracking retired. Sourced directly via supplier pickups.';

-- 3. ENSURE OPTIMAL COMPOSITE INDEXES FOR DIRECT CATALOG BROWSING & SUPPLIER ASSIGNMENT
CREATE INDEX IF NOT EXISTS idx_products_company_active ON products(company_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON products(category, is_active) WHERE deleted_at IS NULL;

-- 4. PRESERVE HISTORICAL AUDIT TRAILS FOR EXISTING INVENTORY TABLES
-- Do NOT drop inventory_batches or inventory_movements; preserve them for regulatory and historical audit compliance.
COMMENT ON TABLE inventory_batches IS 'HISTORICAL ARCHIVE: Preserved for historical traceability and regulatory compliance prior to direct-supply migration.';
COMMENT ON TABLE inventory_movements IS 'HISTORICAL ARCHIVE: Preserved for historical inventory ledger audit trail prior to direct-supply migration.';
