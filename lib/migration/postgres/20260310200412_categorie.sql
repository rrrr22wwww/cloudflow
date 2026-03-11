-- +goose Up
SELECT 'up SQL query';
CREATE TABLE categories (
    id  SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER,

    FOREIGN KEY(parent_id) REFERENCES categories(id)
);
-- +goose Down
SELECT 'down SQL query';
DROP TABLE categories;
