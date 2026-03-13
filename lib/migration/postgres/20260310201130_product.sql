-- +goose Up
CREATE TYPE status_enum AS ENUM ('active', 'inactive', 'archived');

SELECT 'up SQL query';
CREATE TABLE products (
    id UUID PRIMARY KEY,
    seller_id UUID,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC,
    rating INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
-- +goose Down
SELECT 'down SQL query';
DROP TABLE products;
DROP TYPE status_enum;