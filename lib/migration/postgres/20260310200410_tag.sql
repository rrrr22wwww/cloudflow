-- +goose Up
SELECT 'up SQL query';
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- +goose Down
SELECT 'down SQL query';
DROP TABLE tags;
