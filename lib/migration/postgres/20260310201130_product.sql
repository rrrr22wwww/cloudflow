-- +goose Up
SELECT 'up SQL query';
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC,
    rating INTEGER,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose Down
SELECT 'down SQL query';
