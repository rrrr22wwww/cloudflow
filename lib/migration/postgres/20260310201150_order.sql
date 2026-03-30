-- +goose Up
SELECT 'up SQL query';

CREATE TYPE order_status AS ENUM ('301', '302', '303', '400','500');

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    buyer_id UUID,
    status SMALLINT NOT NULL DEFAULT 100 CHECK (status IN (
        100, 102,           -- Ожидание/Процесс
        200,                -- Успех
        302,                -- Ожидание подтверждения
        400, 401, 402, 403, 404, 408, 409, 499,  -- Отказы клиента
        500, 502, 503, 504  -- Ошибки системы
    )),
    total_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
);

-- +goose Down
SELECT 'down SQL query';
DROP TABLE orders;
DROP TYPE order_status ;
