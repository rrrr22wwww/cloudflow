-- +goose Up
SELECT 'up SQL query';

CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered');

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID,
    status order_status,
    total_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
);

-- +goose Down
SELECT 'down SQL query';
DROP TABLE orders;
DROP TYPE order_status ;
