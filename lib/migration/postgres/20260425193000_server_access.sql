-- +goose Up
SELECT 'up SQL query';

CREATE TABLE IF NOT EXISTS server_access (
    product_id UUID PRIMARY KEY,
    ip_address VARCHAR(128) NOT NULL,
    ssh_username VARCHAR(100) NOT NULL,
    ssh_password TEXT,
    ssh_private_key TEXT,
    port INTEGER DEFAULT 22,
    connection_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_server_access_product_id ON server_access(product_id);

-- +goose Down
SELECT 'down SQL query';

DROP INDEX IF EXISTS idx_server_access_product_id;
DROP TABLE IF EXISTS server_access;
