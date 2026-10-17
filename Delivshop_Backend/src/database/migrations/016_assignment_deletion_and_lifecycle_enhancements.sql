-- Delivshop PostgreSQL Schema Migration 016
-- Assignment Deletion, Archival and Operational Lifecycle Protection Enhancements

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ADD SOFT DELETION & ARCHIVAL AUDIT COLUMNS TO DELIVERY_RUNS
ALTER TABLE delivery_runs
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- 2. CREATE INDEXES FOR FAST FILTERING OF ACTIVE VS ARCHIVED RUNS
CREATE INDEX IF NOT EXISTS idx_delivery_runs_deleted_at ON delivery_runs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_delivery_runs_active_runs ON delivery_runs(delivery_date, status) WHERE deleted_at IS NULL;
