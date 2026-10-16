-- ============================================================================
-- DELIVSHOP MIGRATION 011: ROUTE CODE CONCURRENCY COUNTERS
-- Concurrency-safe atomic counter for route codes formatted as RTE-YYYYMMDD-001
-- ============================================================================

CREATE TABLE IF NOT EXISTS route_code_counters (
    counter_date DATE PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_sequence >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_code_counters_date ON route_code_counters(counter_date);
