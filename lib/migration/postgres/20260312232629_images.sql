-- +goose Up
SELECT 'up SQL query';

CREATE TABLE images (
    id UUID PRIMARY KEY,
    target_id UUID,
    file_name VARCHAR(255) NOT NULL ,
    is_preview BOOLEAN DEFAULT FALSE,
    sorted_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (target_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX idx_images_product_id ON images(target_id);
-- +goose Down
SELECT 'down SQL query';
DROP TABLE images;
DROP INDEX idx_images_product_id;