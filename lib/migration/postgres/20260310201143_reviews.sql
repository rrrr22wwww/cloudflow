-- +goose Up
SELECT 'up SQL query';
CREATE  TABLE  reviews (
    id SERIAL PRIMARY KEY,
    product_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating INTEGER,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                       );
-- +goose Down
SELECT 'down SQL query';
DROP TABLE reviews;
