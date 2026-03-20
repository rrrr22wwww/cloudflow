-- +goose Up
SELECT 'up SQL query';
CREATE TYPE user_role AS ENUM ('User', 'Moderator', 'Seller', 'Creator');
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    img_user VARCHAR(255),
    role user_role,
    rating INTEGER,
    balance NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose Down
SELECT 'down SQL query';
DROP TABLE users;
DROP TYPE user_role;
