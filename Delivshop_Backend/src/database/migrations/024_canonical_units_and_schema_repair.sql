-- Delivshop Migration 024
-- Canonical Product Units, Schema Constraint Repair & Accurate Packaging Specifications

-- 1. Ensure inventory_batches has unique constraint required by ON CONFLICT (product_id, batch_number)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_product_batch' AND conrelid = 'inventory_batches'::regclass
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_batches_product_batch ON inventory_batches(product_id, batch_number);
        ALTER TABLE inventory_batches ADD CONSTRAINT uq_product_batch UNIQUE USING INDEX idx_batches_product_batch;
    END IF;
END $$;

-- 2. Ensure inventory_movements has all required audit ledger columns
ALTER TABLE inventory_movements
    ADD COLUMN IF NOT EXISTS quantity_change INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS previous_stock INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS new_stock INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movements_batch_id ON inventory_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON inventory_movements(created_at);

-- 3. Correct product records to their canonical identities, categories, and physical units
-- Product BUTTER-500G: Fresh Dairy Butter (Solid mass: 500g block, 20 per crate, category Butter, base_unit Kilogram)
UPDATE products 
SET name = 'Fresh Dairy Butter',
    category = 'Butter',
    pack_size = '500g Block',
    selling_unit = 'Block',
    purchase_unit = 'Crate',
    base_unit = 'Kilogram',
    units_per_pack = 20.00
WHERE sku = 'BUTTER-500G';

-- Product KHOA-500G: Pure Desi Khoa / Mawa (Solid mass: 500g pack, 10 per crate, category Khoa, base_unit Kilogram)
UPDATE products 
SET name = 'Pure Desi Khoa (Mawa)',
    category = 'Khoa',
    pack_size = '500g Pack',
    selling_unit = 'Pack',
    purchase_unit = 'Crate',
    base_unit = 'Kilogram',
    units_per_pack = 10.00
WHERE sku = 'KHOA-500G';

-- Product CHAAS-200ML: Fresh Spiced Buttermilk (Liquid volume: 200ml pouch, 30 per crate, category Buttermilk, base_unit Litre)
UPDATE products 
SET name = 'Fresh Spiced Buttermilk',
    category = 'Buttermilk',
    pack_size = '200ml Pouch',
    selling_unit = 'Pouch',
    purchase_unit = 'Crate',
    base_unit = 'Litre',
    units_per_pack = 30.00
WHERE sku = 'CHAAS-200ML';

-- 4. Idempotently insert dedicated bottled Buttermilk products with canonical Litre base units
DO $$
DECLARE
    v_company_id UUID;
BEGIN
    SELECT id INTO v_company_id FROM companies WHERE status = 'ACTIVE' ORDER BY created_at ASC LIMIT 1;
    
    IF v_company_id IS NOT NULL THEN
        -- Buttermilk 500ml Bottle (0.5 L volume)
        IF NOT EXISTS (SELECT 1 FROM products WHERE sku = 'BTMK-500ML') THEN
            INSERT INTO products (
                company_id, name, sku, category, base_unit, pack_size, units_per_pack,
                purchase_unit, selling_unit, purchase_cost, price, stock_quantity,
                min_stock_threshold, reorder_quantity, tax_rate, is_tax_inclusive,
                track_inventory, track_batches, storage_temperature, shelf_life_days, is_active
            ) VALUES (
                v_company_id, 'Fresh Spiced Buttermilk (500ml Bottle)', 'BTMK-500ML', 'Buttermilk',
                'Litre', '500ml Bottle', 20.00, 'Crate', 'Bottle', 28.00, 38.00, 0,
                10, 50, 0.00, true, false, false, '2°C to 4°C (Refrigerated)', 7, true
            );
        END IF;

        -- Buttermilk 1L Bottle (1.0 L volume)
        IF NOT EXISTS (SELECT 1 FROM products WHERE sku = 'BTMK-1L') THEN
            INSERT INTO products (
                company_id, name, sku, category, base_unit, pack_size, units_per_pack,
                purchase_unit, selling_unit, purchase_cost, price, stock_quantity,
                min_stock_threshold, reorder_quantity, tax_rate, is_tax_inclusive,
                track_inventory, track_batches, storage_temperature, shelf_life_days, is_active
            ) VALUES (
                v_company_id, 'Fresh Spiced Buttermilk (1L Bottle)', 'BTMK-1L', 'Buttermilk',
                'Litre', '1L Bottle', 10.00, 'Crate', 'Bottle', 50.00, 68.00, 0,
                10, 50, 0.00, true, false, false, '2°C to 4°C (Refrigerated)', 7, true
            );
        END IF;
    END IF;
END $$;
