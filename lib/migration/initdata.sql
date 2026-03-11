CREATE TYPE user_role AS ENUM ('User', 'Moderator', 'Seller', 'Creator');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered');

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT,
    seller_id UUID,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC,
    rating INTEGER,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id INTEGER SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    parent_id INTEGER,
    FOREIGN KEY(parent_id) REFERENCES categories(id)
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role user_role,
    rating INTEGER,
    balance NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT,
    buyer_id UUID,
    status order_status,
    total_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(buyer_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT,
    order_id UUID,
    price_at_purchase NUMERIC,
    seller_id UUID,
    product_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(seller_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id),
    FOREIGN KEY(order_id) REFERENCES orders(id)
);
