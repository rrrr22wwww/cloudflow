-- +goose Up
SELECT 'up SQL query';
ALTER TABLE totp_user_id
  ADD CONSTRAINT fk_totp_user
  FOREIGN KEY (user_id) REFERENCES users(id);
-- +goose Down
SELECT 'down SQL query';
ALTER TABLE totp_user_id DROP CONSTRAINT fk_user_totp_user_id;
