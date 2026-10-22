-- Delivshop PostgreSQL Schema Migration 027
-- Add independent Start Location and Return Location fields to routes and delivery_runs
-- Supports coordinates, address, and location name for end-to-end trip planning

-- 1. Extend routes table with start and return location coordinates and addresses
ALTER TABLE routes
    ADD COLUMN IF NOT EXISTS start_location_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS start_latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS start_longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS start_address TEXT,
    ADD COLUMN IF NOT EXISTS start_place_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_location_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS return_longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS return_address TEXT,
    ADD COLUMN IF NOT EXISTS return_place_id VARCHAR(255);

-- 2. Extend delivery_runs table for operational run-specific location overrides
ALTER TABLE delivery_runs
    ADD COLUMN IF NOT EXISTS start_location_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS start_latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS start_longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS start_address TEXT,
    ADD COLUMN IF NOT EXISTS return_location_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS return_latitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS return_longitude NUMERIC(10, 7),
    ADD COLUMN IF NOT EXISTS return_address TEXT;

-- 3. Coordinate validation constraints on routes (lat -90..90, lng -180..180)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_routes_start_latitude'
    ) THEN
        ALTER TABLE routes ADD CONSTRAINT chk_routes_start_latitude
            CHECK (start_latitude IS NULL OR (start_latitude >= -90.0 AND start_latitude <= 90.0));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_routes_start_longitude'
    ) THEN
        ALTER TABLE routes ADD CONSTRAINT chk_routes_start_longitude
            CHECK (start_longitude IS NULL OR (start_longitude >= -180.0 AND start_longitude <= 180.0));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_routes_return_latitude'
    ) THEN
        ALTER TABLE routes ADD CONSTRAINT chk_routes_return_latitude
            CHECK (return_latitude IS NULL OR (return_latitude >= -90.0 AND return_latitude <= 90.0));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_routes_return_longitude'
    ) THEN
        ALTER TABLE routes ADD CONSTRAINT chk_routes_return_longitude
            CHECK (return_longitude IS NULL OR (return_longitude >= -180.0 AND return_longitude <= 180.0));
    END IF;
END $$;

-- 4. Backfill existing routes with safe, sensible location values based on depot
UPDATE routes
SET
    start_location_name = COALESCE(start_location_name, depot, 'Pune Central Cold Depot'),
    start_latitude = COALESCE(start_latitude, 18.5204),
    start_longitude = COALESCE(start_longitude, 73.8567),
    start_address = COALESCE(start_address, COALESCE(depot, 'Pune Central Cold Depot') || ', Pune, Maharashtra'),
    return_location_name = COALESCE(return_location_name, depot, 'Pune Central Cold Depot'),
    return_latitude = COALESCE(return_latitude, 18.5204),
    return_longitude = COALESCE(return_longitude, 73.8567),
    return_address = COALESCE(return_address, COALESCE(depot, 'Pune Central Cold Depot') || ', Pune, Maharashtra')
WHERE start_latitude IS NULL OR return_latitude IS NULL;
