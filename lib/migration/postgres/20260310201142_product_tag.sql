-- +goose Up
SELECT 'up SQL query';

CREATE TABLE product_tag (
    product_id UUID,
    tag_id INTEGER,
    PRIMARY KEY (product_id, tag_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
-- +goose Down
DROP TABLE product_tag;