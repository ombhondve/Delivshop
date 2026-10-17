-- ============================================================================
-- DELIVSHOP MIGRATION 014: FLEET & VEHICLE MANAGEMENT ENTERPRISE ENHANCEMENTS
-- 1. Extends vehicles table with nickname, manufacturing year, and temperature range.
-- 2. Enhances vehicle_documents for secure file persistence & metadata.
-- 3. Expands vehicle_documents check constraint for temperature calibration & other docs.
-- 4. Adds composite indexes for high-performance fleet querying and status filtering.
-- ============================================================================

-- 1. VEHICLES TABLE ENHANCEMENTS
ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
    ADD COLUMN IF NOT EXISTS manufacturing_year INTEGER CHECK (manufacturing_year IS NULL OR (manufacturing_year >= 1990 AND manufacturing_year <= 2100)),
    ADD COLUMN IF NOT EXISTS temperature_min_c NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS temperature_max_c NUMERIC(4, 1);

-- 2. VEHICLE DOCUMENTS TABLE: Add file storage metadata
ALTER TABLE vehicle_documents
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- 3. EXPAND VEHICLE DOCUMENT TYPE CHECK CONSTRAINT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vehicle_documents_document_type_check' 
        AND conrelid = 'vehicle_documents'::regclass
    ) THEN
        ALTER TABLE vehicle_documents DROP CONSTRAINT vehicle_documents_document_type_check;
    END IF;

    ALTER TABLE vehicle_documents ADD CONSTRAINT vehicle_documents_document_type_check 
        CHECK (document_type IN (
            'RC', 'INSURANCE', 'PUC', 'FITNESS', 'PERMIT', 
            'TEMPERATURE_CALIBRATION', 'OTHER'
        ));
END $$;

-- 4. PERFORMANCE & COMPLIANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_vehicles_depot ON vehicles(depot);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_status ON vehicle_documents(verification_status);
CREATE INDEX IF NOT EXISTS idx_vehicle_maint_date ON vehicle_maintenance(service_date);
