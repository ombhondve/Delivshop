-- ============================================================================
-- DELIVSHOP MIGRATION 013: DRIVER & VEHICLE MANAGEMENT ENHANCEMENTS
-- 1. Decouples vehicles from operational city/state requirements.
-- 2. Enhances driver documents for secure file persistence & metadata.
-- 3. Extends driver salary configs for salary types, allowances & deductions.
-- ============================================================================

-- 1. VEHICLES TABLE ENHANCEMENTS: Allow city/state to be nullable
ALTER TABLE vehicles ALTER COLUMN city DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN state DROP NOT NULL;

-- 2. DRIVER DOCUMENTS TABLE: Add file storage metadata
ALTER TABLE driver_documents
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS storage_path TEXT,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Expand document type check constraint to include 'EMPLOYMENT_CONTRACT' and 'OTHER'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'driver_documents_document_type_check' 
        AND conrelid = 'driver_documents'::regclass
    ) THEN
        ALTER TABLE driver_documents DROP CONSTRAINT driver_documents_document_type_check;
    END IF;

    ALTER TABLE driver_documents ADD CONSTRAINT driver_documents_document_type_check 
        CHECK (document_type IN (
            'DRIVING_LICENSE', 'AADHAAR', 'PAN', 
            'POLICE_VERIFICATION', 'MEDICAL_FITNESS', 
            'EMPLOYMENT_CONTRACT', 'OTHER'
        ));
END $$;

-- 3. DRIVER SALARY CONFIGURATIONS: Add salary type, allowances, and deductions
ALTER TABLE driver_salary_configs
    ADD COLUMN IF NOT EXISTS salary_type VARCHAR(50) DEFAULT 'MONTHLY' CHECK (salary_type IN ('MONTHLY', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'PER_DELIVERY')),
    ADD COLUMN IF NOT EXISTS hra_allowance NUMERIC(10, 2) DEFAULT 0.00 CHECK (hra_allowance >= 0),
    ADD COLUMN IF NOT EXISTS fuel_allowance NUMERIC(10, 2) DEFAULT 0.00 CHECK (fuel_allowance >= 0),
    ADD COLUMN IF NOT EXISTS pf_deduction NUMERIC(10, 2) DEFAULT 0.00 CHECK (pf_deduction >= 0),
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVISED', 'SUSPENDED'));
