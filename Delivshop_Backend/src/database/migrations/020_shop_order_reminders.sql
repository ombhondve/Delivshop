-- Delivshop PostgreSQL Schema Migration 020
-- Shop Order Reminders, Device Tokens, and Tracking History

-- 1. Shop Devices / Push Tokens Table
CREATE TABLE IF NOT EXISTS shop_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL DEFAULT 'android',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_shop_fcm_token UNIQUE (shop_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_shop_devices_shop_id ON shop_devices(shop_id);

-- 2. Shop Order Reminders Log
CREATE TABLE IF NOT EXISTS shop_order_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    reporting_date DATE NOT NULL,
    reminder_type VARCHAR(50) NOT NULL DEFAULT 'ORDER_CUTOFF_REMINDER',
    channel VARCHAR(50) NOT NULL DEFAULT 'PUSH_NOTIFICATION',
    recipient_phone VARCHAR(50),
    recipient_name VARCHAR(255),
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACCEPTED_FOR_DISPATCH',
    provider VARCHAR(50) NOT NULL DEFAULT 'FIREBASE_FCM',
    provider_message_id VARCHAR(255),
    error_reason TEXT,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    idempotency_key VARCHAR(255),
    batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shop_reminders_shop_date ON shop_order_reminders(shop_id, reporting_date);
CREATE INDEX IF NOT EXISTS idx_shop_reminders_date_status ON shop_order_reminders(reporting_date, status);
CREATE INDEX IF NOT EXISTS idx_shop_reminders_idempotency ON shop_order_reminders(idempotency_key) WHERE idempotency_key IS NOT NULL;
