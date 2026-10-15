-- Delivshop PostgreSQL Schema Migration 006
-- Production Products & Inventory Management, Batches, and Auditable Stock Ledger

-- 1. Modify Products Table for Central Distribution & Dairy Specs
ALTER TABLE products ALTER COLUMN shop_id DROP NOT NULL;

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS base_unit VARCHAR(50) NOT NULL DEFAULT 'Litre',
    ADD COLUMN IF NOT EXISTS pack_size VARCHAR(100) NOT NULL DEFAULT '1L Pouch',
    ADD COLUMN IF NOT EXISTS units_per_pack NUMERIC(8, 2) NOT NULL DEFAULT 1 CHECK (units_per_pack > 0),
    ADD COLUMN IF NOT EXISTS purchase_unit VARCHAR(50) DEFAULT 'Crate',
    ADD COLUMN IF NOT EXISTS selling_unit VARCHAR(50) DEFAULT 'Piece',
    ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (purchase_cost >= 0),
    ADD COLUMN IF NOT EXISTS min_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (min_stock_threshold >= 0),
    ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER NOT NULL DEFAULT 50 CHECK (reorder_quantity >= 0),
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (tax_rate >= 0),
    ADD COLUMN IF NOT EXISTS is_tax_inclusive BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS min_selling_price NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS track_batches BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS storage_temperature VARCHAR(50) DEFAULT '2°C to 4°C (Refrigerated)',
    ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER DEFAULT 7,
    ADD COLUMN IF NOT EXISTS fat_percentage NUMERIC(4, 2),
    ADD COLUMN IF NOT EXISTS snf_percentage NUMERIC(4, 2),
    ADD COLUMN IF NOT EXISTS fssai_license VARCHAR(100);

-- Backfill purchase_cost for existing products if 0
UPDATE products 
SET purchase_cost = ROUND(price * 0.75, 2)
WHERE purchase_cost = 0 AND price > 0;

-- Associate any unassociated products with the primary active dairy company
UPDATE products
SET company_id = (SELECT id FROM companies WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1)
WHERE company_id IS NULL AND EXISTS (SELECT 1 FROM companies WHERE status = 'ACTIVE');

-- Ensure global SKU uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- 2. Create Inventory Batches Table (Expiry & Batch Tracking)
CREATE TABLE IF NOT EXISTS inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL CHECK (quantity_received >= 0),
    quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    purchase_cost NUMERIC(10, 2) DEFAULT 0.00 CHECK (purchase_cost >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'DEPLETED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_batch UNIQUE (product_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_batches_product_id ON inventory_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON inventory_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_status ON inventory_batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_company_id ON inventory_batches(company_id);

-- 3. Create Inventory Movements Table (Append-Only Audit Stock Ledger)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_number VARCHAR(50) NOT NULL UNIQUE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_id UUID REFERENCES inventory_batches(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (
        movement_type IN (
            'OPENING_STOCK',
            'PURCHASE_RECEIPT',
            'STOCK_ADJUSTMENT_INCREASE',
            'STOCK_ADJUSTMENT_DECREASE',
            'ORDER_DISPATCH',
            'RETURN_RESTOCK',
            'DAMAGE_WRITE_OFF',
            'EXPIRY_DISPOSAL',
            'REVERSAL'
        )
    ),
    quantity_change INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    unit_cost NUMERIC(10, 2) DEFAULT 0.00,
    reference_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    reference_id VARCHAR(100),
    reason TEXT,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product_id ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_batch_id ON inventory_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements(created_at DESC);

-- 4. Create Movement Counter Sequence
CREATE TABLE IF NOT EXISTS inventory_movement_counters (
    counter_prefix VARCHAR(20) PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 1000 CHECK (last_sequence >= 1000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO inventory_movement_counters (counter_prefix, last_sequence)
VALUES ('MOV', 1000)
ON CONFLICT (counter_prefix) DO NOTHING;

-- 5. Seed Initial Batches & Opening Stock Ledger for Existing Products
INSERT INTO inventory_batches (
    product_id, 
    company_id, 
    batch_number, 
    manufacturing_date, 
    expiry_date, 
    quantity_received, 
    quantity_remaining, 
    purchase_cost, 
    status,
    notes
)
SELECT 
    p.id, 
    p.company_id, 
    'BATCH-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || SUBSTRING(p.sku, 1, 6), 
    CURRENT_DATE - INTERVAL '1 day', 
    CURRENT_DATE + INTERVAL '12 days', 
    p.stock_quantity, 
    p.stock_quantity, 
    p.purchase_cost, 
    'ACTIVE',
    'Opening balance initialized from existing catalogue'
FROM products p
WHERE p.stock_quantity > 0 
  AND NOT EXISTS (SELECT 1 FROM inventory_batches b WHERE b.product_id = p.id)
ON CONFLICT (product_id, batch_number) DO NOTHING;

-- Seed Corresponding Opening Movement in Ledger
INSERT INTO inventory_movements (
    movement_number,
    product_id,
    batch_id,
    movement_type,
    quantity_change,
    previous_stock,
    new_stock,
    unit_cost,
    reference_type,
    reference_id,
    reason,
    created_at
)
SELECT
    'MOV-' || (1000 + ROW_NUMBER() OVER (ORDER BY p.created_at)),
    p.id,
    b.id,
    'OPENING_STOCK',
    p.stock_quantity,
    0,
    p.stock_quantity,
    p.purchase_cost,
    'SYSTEM',
    'MIGRATION-006',
    'Opening inventory reconciliation for existing dairy catalogue',
    NOW()
FROM products p
LEFT JOIN inventory_batches b ON b.product_id = p.id
WHERE p.stock_quantity > 0
  AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.product_id = p.id)
ON CONFLICT (movement_number) DO NOTHING;

-- Update movement counter to account for seeded records
UPDATE inventory_movement_counters
SET last_sequence = GREATEST(last_sequence, 1000 + (SELECT COUNT(*) FROM products WHERE stock_quantity > 0))
WHERE counter_prefix = 'MOV';
