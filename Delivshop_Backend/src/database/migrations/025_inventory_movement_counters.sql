-- Delivshop Migration 025
-- Inventory Movement Counter Sequences

CREATE TABLE IF NOT EXISTS inventory_movement_counters (
    counter_prefix VARCHAR(20) PRIMARY KEY,
    last_sequence INTEGER NOT NULL DEFAULT 1000 CHECK (last_sequence >= 1000),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO inventory_movement_counters (counter_prefix, last_sequence)
VALUES ('MOV', 1000)
ON CONFLICT (counter_prefix) DO NOTHING;
