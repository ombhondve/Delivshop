-- Delivshop PostgreSQL Schema Migration 017
-- Orders Dispatch Volume, Packaging Specifications & Aggregated Inventory Summary

-- 1. Enhance order_items with unit type, crates, delivered quantities, and volume tracking
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) NOT NULL DEFAULT 'PACKAGE',
    ADD COLUMN IF NOT EXISTS crates_count NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS delivered_quantity INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS volume_litres NUMERIC(10, 3) DEFAULT 0;

-- 2. Enhance orders with volume and crate rollups
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS total_volume_litres NUMERIC(10, 3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_crates_count NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_packages_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 3. Update products with accurate dairy packaging specifications and units per crate
UPDATE products SET pack_size = '1L Pouch', units_per_pack = 12, base_unit = 'Litre' WHERE sku = 'MILK-COW-1L';
UPDATE products SET pack_size = '500ml Pouch', units_per_pack = 24, base_unit = 'Litre' WHERE sku = 'MILK-TONED-500';
UPDATE products SET pack_size = '1L Pouch', units_per_pack = 12, base_unit = 'Litre' WHERE sku = 'MILK-BUF-1L';
UPDATE products SET pack_size = '200ml Pouch', units_per_pack = 30, base_unit = 'Litre' WHERE sku = 'CHAAS-200ML';
UPDATE products SET pack_size = '1L Tin', units_per_pack = 12, base_unit = 'Litre' WHERE sku = 'GHEE-1L';
UPDATE products SET pack_size = '500g Cup', units_per_pack = 12, base_unit = 'Kilogram' WHERE sku = 'CURD-500G';
UPDATE products SET pack_size = '500g Block', units_per_pack = 20, base_unit = 'Kilogram' WHERE sku = 'BUTTER-500G';
UPDATE products SET pack_size = '1kg Block', units_per_pack = 10, base_unit = 'Kilogram' WHERE sku = 'PANEER-1KG';
UPDATE products SET pack_size = '200g Pack', units_per_pack = 20, base_unit = 'Kilogram' WHERE sku = 'PANEER-200G';
UPDATE products SET pack_size = '500g Pack', units_per_pack = 10, base_unit = 'Kilogram' WHERE sku = 'KHOA-500G';

-- 4. Idempotently insert standard dispatch merchant shops if not present
DO $$
DECLARE
    v_admin_id UUID;
    v_owner_id UUID;
    v_shop1_id UUID;
    v_shop2_id UUID;
    v_shop3_id UUID;
    v_shop4_id UUID;
    v_shop5_id UUID;
    v_driver_ramesh UUID;
    v_driver_sunil UUID;
    v_driver_amit UUID;
    v_driver_ganesh UUID;
    v_prod_cow_1l UUID;
    v_prod_toned_500 UUID;
    v_prod_buf_1l UUID;
    v_prod_curd_500 UUID;
    v_prod_paneer_200 UUID;
    v_order1_id UUID;
    v_order2_id UUID;
    v_order3_id UUID;
    v_order4_id UUID;
    v_order5_id UUID;
BEGIN
    SELECT id INTO v_admin_id FROM users WHERE role = 'ADMIN' LIMIT 1;
    v_owner_id := v_admin_id;

    -- Drivers
    SELECT id INTO v_driver_ramesh FROM users WHERE name ILIKE '%Ramesh%' LIMIT 1;
    SELECT id INTO v_driver_sunil FROM users WHERE name ILIKE '%Sunil%' OR name ILIKE '%Rajesh%' LIMIT 1;
    SELECT id INTO v_driver_amit FROM users WHERE name ILIKE '%Amit%' OR name ILIKE '%Santosh%' LIMIT 1;
    SELECT id INTO v_driver_ganesh FROM users WHERE name ILIKE '%Ganesh%' OR name ILIKE '%Vikas%' LIMIT 1;

    -- Products
    SELECT id INTO v_prod_cow_1l FROM products WHERE sku = 'MILK-COW-1L';
    SELECT id INTO v_prod_toned_500 FROM products WHERE sku = 'MILK-TONED-500';
    SELECT id INTO v_prod_buf_1l FROM products WHERE sku = 'MILK-BUF-1L';
    SELECT id INTO v_prod_curd_500 FROM products WHERE sku = 'CURD-500G';
    SELECT id INTO v_prod_paneer_200 FROM products WHERE sku = 'PANEER-200G';

    -- 1. Krishna Dairy & Provisions
    SELECT id INTO v_shop1_id FROM shops WHERE shop_id = 'SH-8821' OR email = 'krishna.dairy@delivshop.internal' LIMIT 1;
    IF v_shop1_id IS NULL THEN
        INSERT INTO shops (name, shop_id, email, phone, address, owner_id, is_open, status)
        VALUES ('Krishna Dairy & Provisions', 'SH-8821', 'krishna.dairy@delivshop.internal', '+91 98221 00101', 'Shop 12, FC Road, Shivajinagar, Pune', v_owner_id, true, 'ACTIVE')
        RETURNING id INTO v_shop1_id;
    END IF;

    -- 2. Anand Supermarket & Milk Depot
    SELECT id INTO v_shop2_id FROM shops WHERE shop_id = 'SH-7740' OR email = 'anand.supermarket@delivshop.internal' LIMIT 1;
    IF v_shop2_id IS NULL THEN
        INSERT INTO shops (name, shop_id, email, phone, address, owner_id, is_open, status)
        VALUES ('Anand Supermarket & Milk Depot', 'SH-7740', 'anand.supermarket@delivshop.internal', '+91 98221 00102', 'Plot 45, Paud Road, Kothrud, Pune', v_owner_id, true, 'ACTIVE')
        RETURNING id INTO v_shop2_id;
    END IF;

    -- 3. Shree Ganesh Dairy Farm
    SELECT id INTO v_shop3_id FROM shops WHERE shop_id = 'SH-9104' OR email = 'ganesh.dairy@delivshop.internal' LIMIT 1;
    IF v_shop3_id IS NULL THEN
        INSERT INTO shops (name, shop_id, email, phone, address, owner_id, is_open, status)
        VALUES ('Shree Ganesh Dairy Farm', 'SH-9104', 'ganesh.dairy@delivshop.internal', '+91 98221 00103', 'Survey 22, Pune-Solapur Road, Hadapsar, Pune', v_owner_id, true, 'ACTIVE')
        RETURNING id INTO v_shop3_id;
    END IF;

    -- 4. Mahesh Retail Store
    SELECT id INTO v_shop4_id FROM shops WHERE shop_id = 'SH-5512' OR email = 'mahesh.retail@delivshop.internal' LIMIT 1;
    IF v_shop4_id IS NULL THEN
        INSERT INTO shops (name, shop_id, email, phone, address, owner_id, is_open, status)
        VALUES ('Mahesh Retail Store', 'SH-5512', 'mahesh.retail@delivshop.internal', '+91 98221 00104', 'Old Mumbai-Pune Highway, Pimpri, Pune', v_owner_id, true, 'ACTIVE')
        RETURNING id INTO v_shop4_id;
    END IF;

    -- 5. Om Sai Dairy Corner
    SELECT id INTO v_shop5_id FROM shops WHERE shop_id = 'SH-6320' OR email = 'omsai.dairy@delivshop.internal' LIMIT 1;
    IF v_shop5_id IS NULL THEN
        INSERT INTO shops (name, shop_id, email, phone, address, owner_id, is_open, status)
        VALUES ('Om Sai Dairy Corner', 'SH-6320', 'omsai.dairy@delivshop.internal', '+91 98221 00105', 'Ghole Road, Shivajinagar, Pune', v_owner_id, true, 'ACTIVE')
        RETURNING id INTO v_shop5_id;
    END IF;

    -- Order 1: DS-26-8891 (216 L liquid milk, 20 crates total, delivered)
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'DS-26-8891') AND v_prod_cow_1l IS NOT NULL AND v_prod_toned_500 IS NOT NULL AND v_prod_curd_500 IS NOT NULL THEN
        INSERT INTO orders (
            order_number, shop_id, status, subtotal, delivery_fee, total,
            total_volume_litres, total_crates_count, total_packages_count,
            delivery_address, notes, created_at, delivered_at
        ) VALUES (
            'DS-26-8891', v_shop1_id, 'DELIVERED', 14850.00, 0.00, 14850.00,
            216.000, 20.00, 336,
            '{"street": "Shop 12, FC Road", "city": "Pune", "area": "Shivajinagar"}'::jsonb,
            'Delivered and verified by shop pin signature.', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'
        ) RETURNING id INTO v_order1_id;

        -- 10 crates 1L milk = 120 pkts, 120 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order1_id, v_prod_cow_1l, 120, 10.00, 120, 120.000, 'CRATE', 68.00, 8160.00);

        -- 8 crates 500ml milk = 192 pkts, 96 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order1_id, v_prod_toned_500, 192, 8.00, 192, 96.000, 'CRATE', 28.00, 5376.00);

        -- 2 crates 500g curd = 24 pkts, 0 L (weight: 12 kg)
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order1_id, v_prod_curd_500, 24, 2.00, 24, 0.000, 'CRATE', 60.00, 1440.00);

        INSERT INTO deliveries (order_id, driver_id, status, delivered_at, delivered_crates_count, returned_crates_count)
        VALUES (v_order1_id, v_driver_ramesh, 'DELIVERED', NOW() - INTERVAL '30 minutes', 20, 20)
        ON CONFLICT (order_id) DO NOTHING;
    END IF;

    -- Order 2: DS-26-8892 (312 L liquid milk, 26 crates, in transit)
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'DS-26-8892') AND v_prod_cow_1l IS NOT NULL AND v_prod_toned_500 IS NOT NULL THEN
        INSERT INTO orders (
            order_number, shop_id, status, subtotal, delivery_fee, total,
            total_volume_litres, total_crates_count, total_packages_count,
            delivery_address, notes, created_at
        ) VALUES (
            'DS-26-8892', v_shop2_id, 'IN_TRANSIT', 22400.00, 0.00, 22400.00,
            312.000, 26.00, 432,
            '{"street": "Plot 45, Paud Road", "city": "Pune", "area": "Kothrud"}'::jsonb,
            'Driver approaching Kothrud depot. ETA 15 mins.', NOW() - INTERVAL '90 minutes'
        ) RETURNING id INTO v_order2_id;

        -- 16 crates 1L milk = 192 pkts, 192 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order2_id, v_prod_cow_1l, 192, 16.00, 192, 192.000, 'CRATE', 68.00, 13056.00);

        -- 10 crates 500ml milk = 240 pkts, 120 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order2_id, v_prod_toned_500, 240, 10.00, 240, 120.000, 'CRATE', 26.00, 6240.00);

        INSERT INTO deliveries (order_id, driver_id, status)
        VALUES (v_order2_id, v_driver_sunil, 'EN_ROUTE_DROPOFF')
        ON CONFLICT (order_id) DO NOTHING;
    END IF;

    -- Order 3: DS-26-8893 (96 L liquid milk, 10 crates, delivered)
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'DS-26-8893') AND v_prod_buf_1l IS NOT NULL AND v_prod_paneer_200 IS NOT NULL THEN
        INSERT INTO orders (
            order_number, shop_id, status, subtotal, delivery_fee, total,
            total_volume_litres, total_crates_count, total_packages_count,
            delivery_address, notes, created_at, delivered_at
        ) VALUES (
            'DS-26-8893', v_shop3_id, 'DELIVERED', 8600.00, 0.00, 8600.00,
            96.000, 10.00, 136,
            '{"street": "Survey 22, Pune-Solapur Road", "city": "Pune", "area": "Hadapsar"}'::jsonb,
            'Delivered early morning drop.', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour'
        ) RETURNING id INTO v_order3_id;

        -- 8 crates 1L buffalo milk = 96 pkts, 96 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order3_id, v_prod_buf_1l, 96, 8.00, 96, 96.000, 'CRATE', 74.00, 7104.00);

        -- 2 crates 200g paneer = 40 pkts, 0 L (weight: 8 kg)
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order3_id, v_prod_paneer_200, 40, 2.00, 40, 0.000, 'CRATE', 92.00, 3680.00);

        INSERT INTO deliveries (order_id, driver_id, status, delivered_at, delivered_crates_count, returned_crates_count)
        VALUES (v_order3_id, v_driver_amit, 'DELIVERED', NOW() - INTERVAL '1 hour', 10, 10)
        ON CONFLICT (order_id) DO NOTHING;
    END IF;

    -- Order 4: DS-26-8894 (264 L liquid milk, 22 crates, disputed shortage)
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'DS-26-8894') AND v_prod_cow_1l IS NOT NULL AND v_prod_toned_500 IS NOT NULL THEN
        INSERT INTO orders (
            order_number, shop_id, status, subtotal, delivery_fee, total,
            total_volume_litres, total_crates_count, total_packages_count,
            delivery_address, notes, created_at
        ) VALUES (
            'DS-26-8894', v_shop4_id, 'CONFIRMED', 19200.00, 0.00, 19200.00,
            264.000, 22.00, 360,
            '{"street": "Old Mumbai-Pune Highway", "city": "Pune", "area": "Pimpri"}'::jsonb,
            'Shop reported 2 crates leaking on arrival. Awaiting supervisor inspection.', NOW() - INTERVAL '1 hour'
        ) RETURNING id INTO v_order4_id;

        -- 14 crates 1L milk = 168 pkts, 168 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order4_id, v_prod_cow_1l, 168, 14.00, 144, 168.000, 'CRATE', 68.00, 9792.00);

        -- 8 crates 500ml milk = 192 pkts, 96 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order4_id, v_prod_toned_500, 192, 8.00, 192, 96.000, 'CRATE', 28.00, 5376.00);

        INSERT INTO deliveries (order_id, driver_id, status, notes)
        VALUES (v_order4_id, v_driver_ganesh, 'FAILED', 'Discrepancy reported on delivery')
        ON CONFLICT (order_id) DO NOTHING;
    END IF;

    -- Order 5: DS-26-8895 (108 L liquid milk, 9 crates, prepared for dispatch)
    IF NOT EXISTS (SELECT 1 FROM orders WHERE order_number = 'DS-26-8895') AND v_prod_toned_500 IS NOT NULL THEN
        INSERT INTO orders (
            order_number, shop_id, status, subtotal, delivery_fee, total,
            total_volume_litres, total_crates_count, total_packages_count,
            delivery_address, notes, created_at
        ) VALUES (
            'DS-26-8895', v_shop5_id, 'PREPARING', 6750.00, 0.00, 6750.00,
            108.000, 9.00, 216,
            '{"street": "Ghole Road", "city": "Pune", "area": "Shivajinagar"}'::jsonb,
            'Loaded in cold storage bay #3. Scheduled for next dispatch wave.', NOW() - INTERVAL '30 minutes'
        ) RETURNING id INTO v_order5_id;

        -- 9 crates 500ml milk = 216 pkts, 108 L
        INSERT INTO order_items (order_id, product_id, quantity, crates_count, delivered_quantity, volume_litres, unit_type, unit_price, total_price)
        VALUES (v_order5_id, v_prod_toned_500, 216, 9.00, 0, 108.000, 'CRATE', 26.00, 5616.00);

        INSERT INTO deliveries (order_id, driver_id, status)
        VALUES (v_order5_id, v_driver_ramesh, 'PENDING_ASSIGNMENT')
        ON CONFLICT (order_id) DO NOTHING;
    END IF;

    -- Update existing orders volume_litres if 0
    UPDATE order_items oi
    SET volume_litres = CASE 
        WHEN p.base_unit = 'Litre' AND p.category IN ('Milk', 'Buttermilk') THEN
            CASE
                WHEN p.pack_size ILIKE '%500ml%' THEN (oi.quantity * 0.5)
                WHEN p.pack_size ILIKE '%200ml%' THEN (oi.quantity * 0.2)
                WHEN p.pack_size ILIKE '%1L%' OR p.pack_size ILIKE '%1 Litre%' THEN (oi.quantity * 1.0)
                ELSE oi.quantity
            END
        ELSE 0
    END
    FROM products p
    WHERE oi.product_id = p.id AND (oi.volume_litres IS NULL OR oi.volume_litres = 0);

    UPDATE orders o
    SET total_volume_litres = sub.total_vol,
        total_packages_count = sub.total_pkgs
    FROM (
        SELECT order_id, COALESCE(SUM(volume_litres), 0) as total_vol, COALESCE(SUM(quantity), 0) as total_pkgs
        FROM order_items
        GROUP BY order_id
    ) sub
    WHERE o.id = sub.order_id AND (o.total_volume_litres IS NULL OR o.total_volume_litres = 0);

END $$;
