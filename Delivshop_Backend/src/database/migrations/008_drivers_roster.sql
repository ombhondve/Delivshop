-- Delivshop PostgreSQL Schema Migration 008
-- Drivers Roster Enhancement, Vehicle Allocations, and Driver Identity Fields

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS assigned_route VARCHAR(255),
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS license_expiry DATE,
    ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_driver_role ON users(role) WHERE role = 'DRIVER';
CREATE INDEX IF NOT EXISTS idx_users_driver_active ON users(role, is_active) WHERE role = 'DRIVER';

-- Seed initial fleet drivers if no DRIVER accounts currently exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'DRIVER' AND deleted_at IS NULL) THEN
        INSERT INTO users (id, name, email, employee_id, phone, password_hash, role, vehicle_number, vehicle_type, assigned_route, license_number, license_expiry, is_active)
        VALUES 
        (gen_random_uuid(), 'Ramesh Kumar', 'ramesh.kumar@delivshop.com', 'EMP-DRV-1001', '+91 98234 11223', '$argon2id$v=19$m=19456,t=2,p=1$h7CfKpeRsacQgZoZKumcaw$0jmEcYMcsw6SFEJfDpAjmaPT2igR9hoGyYPWAXlUjRs', 'DRIVER', 'MH-12-DV-4421', 'Refrigerated Van (1.5 Ton)', 'Route 1 • Central & Camp Area', 'MH-12-2021-008912', '2028-12-31', TRUE),
        (gen_random_uuid(), 'Rajesh Sharma', 'rajesh.sharma@delivshop.com', 'EMP-DRV-1002', '+91 98450 33445', '$argon2id$v=19$m=19456,t=2,p=1$h7CfKpeRsacQgZoZKumcaw$0jmEcYMcsw6SFEJfDpAjmaPT2igR9hoGyYPWAXlUjRs', 'DRIVER', 'MH-12-DV-8812', 'Insulated Delivery Van', 'Route 2 • Kothrud & Karve Road', 'MH-12-2020-004123', '2027-08-15', TRUE),
        (gen_random_uuid(), 'Santosh Patil', 'santosh.patil@delivshop.com', 'EMP-DRV-1003', '+91 97654 88761', '$argon2id$v=19$m=19456,t=2,p=1$h7CfKpeRsacQgZoZKumcaw$0jmEcYMcsw6SFEJfDpAjmaPT2igR9hoGyYPWAXlUjRs', 'DRIVER', 'MH-14-BT-3109', 'Refrigerated Milk Tanker', 'Route 3 • Hadapsar Wholesale Hub', 'MH-14-2019-009871', '2029-04-20', TRUE),
        (gen_random_uuid(), 'Vikas More', 'vikas.more@delivshop.com', 'EMP-DRV-1004', '+91 99220 54321', '$argon2id$v=19$m=19456,t=2,p=1$h7CfKpeRsacQgZoZKumcaw$0jmEcYMcsw6SFEJfDpAjmaPT2igR9hoGyYPWAXlUjRs', 'DRIVER', 'MH-12-DV-9901', 'Electric Cargo Van', 'Route 4 • Viman Nagar & Kalyani Nagar', 'MH-12-2022-003344', '2026-11-30', TRUE),
        (gen_random_uuid(), 'Anil Jadhav', 'anil.jadhav@delivshop.com', 'EMP-DRV-1005', '+91 98111 67890', '$argon2id$v=19$m=19456,t=2,p=1$h7CfKpeRsacQgZoZKumcaw$0jmEcYMcsw6SFEJfDpAjmaPT2igR9hoGyYPWAXlUjRs', 'DRIVER', 'MH-12-DV-1234', 'Refrigerated Van (1.5 Ton)', 'Route 5 • Aundh & Baner Morning Run', 'MH-12-2018-001290', '2025-10-10', FALSE);
    END IF;
END $$;
