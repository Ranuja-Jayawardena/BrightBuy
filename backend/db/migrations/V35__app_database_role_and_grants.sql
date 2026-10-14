-- V35: Application & Migration Database Accounts (Least-Privilege Separation)
-- Fix 8.11: Establish brightbuy_app (least-privilege DML) and brightbuy_migrator (DDL) roles (Member E)

-- 1. Create runtime application role (brightbuy_app) if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'brightbuy_app') THEN
        CREATE ROLE brightbuy_app WITH LOGIN PASSWORD 'brightbuy_app_pass';
    END IF;
END
$$;

-- 2. Create migration role (brightbuy_migrator) if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'brightbuy_migrator') THEN
        CREATE ROLE brightbuy_migrator WITH LOGIN PASSWORD 'brightbuy_migrator_pass';
    END IF;
END
$$;

-- 3. Schema-level permissions on public
-- Revoke CREATE on public from PUBLIC and brightbuy_app to prevent unauthorized DDL
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM brightbuy_app;
GRANT USAGE ON SCHEMA public TO brightbuy_app;

-- Grant DDL permissions on public schema to brightbuy_migrator
GRANT USAGE, CREATE ON SCHEMA public TO brightbuy_migrator;

-- 4. Grant DML permissions on existing tables to brightbuy_app
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO brightbuy_app;

-- 5. Restrict append-only audit & ledger tables (NO UPDATE, NO DELETE, NO TRUNCATE)
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE inventory_adjustments FROM brightbuy_app;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE payment_reconciliation_logs FROM brightbuy_app;

-- 6. Restrict Flyway migration schema history (read-only for application)
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE flyway_schema_history FROM brightbuy_app;
GRANT SELECT ON TABLE flyway_schema_history TO brightbuy_app;

-- 7. Grant sequence and routine permissions to brightbuy_app
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO brightbuy_app;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO brightbuy_app;

-- 8. Grant full ownership/privileges on all schema objects to brightbuy_migrator
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO brightbuy_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO brightbuy_migrator;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO brightbuy_migrator;

-- 9. Set default privileges for future objects created in schema public
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO brightbuy_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO brightbuy_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT EXECUTE ON ROUTINES TO brightbuy_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO brightbuy_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO brightbuy_migrator;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON ROUTINES TO brightbuy_migrator;
