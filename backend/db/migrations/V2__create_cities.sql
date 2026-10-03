CREATE TABLE cities (
    city_id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    state VARCHAR(100) DEFAULT 'Texas',
    is_main_city BOOLEAN NOT NULL DEFAULT false
);
