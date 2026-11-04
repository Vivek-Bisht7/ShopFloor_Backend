-- User Schemas

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
        CHECK (name IN ('admin', 'planner', 'operator'))
);


CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,

    role_id INTEGER NOT NULL
        REFERENCES roles(id),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Receipts schemas

CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(10) NOT NULL
        CHECK (unit IN ('kg', 'm', 'pcs')),
    reorder_level NUMERIC(12, 3) NOT NULL DEFAULT 0
        CHECK (reorder_level >= 0),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE material_stock (
    id SERIAL PRIMARY KEY,

    material_id INTEGER NOT NULL UNIQUE
        REFERENCES materials(id),

    on_hand NUMERIC(12, 3) NOT NULL DEFAULT 0,
    reserved NUMERIC(12, 3) NOT NULL DEFAULT 0,

    CONSTRAINT stock_non_negative
        CHECK (on_hand >= 0 AND reserved >= 0),

    CONSTRAINT reserved_not_exceed_on_hand
        CHECK (reserved <= on_hand)
);


CREATE TABLE goods_receipts (
    id SERIAL PRIMARY KEY,

    material_id INTEGER NOT NULL
        REFERENCES materials(id),

    supplier_id INTEGER NOT NULL
        REFERENCES suppliers(id),

    quantity NUMERIC(12, 3) NOT NULL
        CHECK (quantity > 0),

    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    received_by INTEGER NOT NULL
        REFERENCES users(id)
);


CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,

    material_id INTEGER NOT NULL
        REFERENCES materials(id),

    type VARCHAR(20) NOT NULL
        CHECK (
            type IN (
                'RECEIPT',
                'RESERVE',
                'UNRESERVE',
                'CONSUME'
            )
        ),

    quantity NUMERIC(12, 3) NOT NULL
        CHECK (quantity > 0),

    reference VARCHAR(100),

    user_id INTEGER NOT NULL
        REFERENCES users(id),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products & BOM Schemas

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    finished_stock NUMERIC(12, 3) NOT NULL DEFAULT 0
        CHECK (finished_stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE bill_of_materials (
    id SERIAL PRIMARY KEY,

    product_id INTEGER NOT NULL
        REFERENCES products(id) ON DELETE CASCADE,

    material_id INTEGER NOT NULL
        REFERENCES materials(id) ON DELETE RESTRICT,

    quantity_per_unit NUMERIC(12, 3) NOT NULL
        CHECK (quantity_per_unit > 0),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_product_material
        UNIQUE (product_id, material_id)
);
