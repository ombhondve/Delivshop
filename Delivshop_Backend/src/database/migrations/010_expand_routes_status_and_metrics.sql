-- ============================================================================
-- DELIVSHOP MIGRATION 010: EXPAND ROUTES STATUS AND OPTIMIZE METRICS
-- Enables PUBLISHED, ACTIVE, DRAFT, INACTIVE, ARCHIVED statuses
-- Adds performance indexes for route corridor queries and stops sequencing
-- ============================================================================

-- 1. Update routes_status_check constraint safely
DO $$
BEGIN
    -- Drop old check constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'routes_status_check' 
        AND conrelid = 'routes'::regclass
    ) THEN
        ALTER TABLE routes DROP CONSTRAINT routes_status_check;
    END IF;

    -- Add updated constraint permitting PUBLISHED, ACTIVE, DRAFT, INACTIVE, ARCHIVED
    ALTER TABLE routes ADD CONSTRAINT routes_status_check 
        CHECK (status IN ('DRAFT', 'ACTIVE', 'PUBLISHED', 'INACTIVE', 'ARCHIVED'));
END $$;

-- 2. Ensure total_distance_km and estimated_duration_minutes default to 0
ALTER TABLE routes ALTER COLUMN total_distance_km SET DEFAULT 0.00;
ALTER TABLE routes ALTER COLUMN estimated_duration_minutes SET DEFAULT 0;

-- 3. Additional performance indexes for multi-city search and filtering
CREATE INDEX IF NOT EXISTS idx_routes_city_status ON routes(city, status);
CREATE INDEX IF NOT EXISTS idx_routes_depot ON routes(depot);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON route_stops(route_id, stop_sequence);
