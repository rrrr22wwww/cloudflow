-- +goose Up
SELECT 'up SQL query';

CREATE TABLE totp_user_id (
    user_id UUID,
    ec_seed VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    confirmed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- +goose Down
SELECT 'down SQL query';
DROP TABLE totp_user_id;
