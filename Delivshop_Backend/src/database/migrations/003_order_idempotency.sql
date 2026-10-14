-- Delivshop Schema Migration 003
-- Idempotency key and performance indexes for Order processing & low-internet resilience

ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);
