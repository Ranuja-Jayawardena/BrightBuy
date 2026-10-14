-- V32__super_admin_protection_trigger.sql
-- Fix 8.6 (Decision D6): Concurrent Super Admin Protection
-- Enforces that at least one active super admin (role = 'super_admin' AND is_active = true)
-- unconditionally exists in the system across updates, demotions, deactivations, deletions,
-- multi-row statements, and cascading deletes from users.

-- 1. Create dedicated guard table for transaction-level serialization
CREATE TABLE IF NOT EXISTS super_admin_guard (
    id INT PRIMARY KEY,
    last_action TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO super_admin_guard (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 2. Trigger function to serialize mutations and guard invariant at row level
CREATE OR REPLACE FUNCTION protect_super_admin_invariant()
RETURNS trigger AS $$
DECLARE
    active_count INT;
BEGIN
    -- Only intercept mutations that reduce an active super admin:
    -- 1. DELETE of an active super admin
    -- 2. UPDATE of an active super admin to non-super_admin role or is_active = false
    IF OLD.role = 'super_admin' AND OLD.is_active = true AND
       (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND (NEW.role <> 'super_admin' OR NEW.is_active = false))) THEN

        -- Acquire serialization row lock across competing transactions
        UPDATE super_admin_guard SET last_action = clock_timestamp() WHERE id = 1;

        -- Check remaining count of active super admins
        SELECT COUNT(*)::INT INTO active_count
        FROM employees
        WHERE role = 'super_admin' AND is_active = true;

        -- If count is 1 or less, reducing this admin would leave 0 active super admins
        IF active_count <= 1 THEN
            RAISE EXCEPTION 'Cannot remove the last active super admin. At least one active super admin must exist in the system.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_super_admin_row ON employees;
CREATE TRIGGER trg_protect_super_admin_row
BEFORE UPDATE OR DELETE ON employees
FOR EACH ROW
EXECUTE FUNCTION protect_super_admin_invariant();

-- 3. Statement-level trigger function to verify invariant after entire statement completes
CREATE OR REPLACE FUNCTION verify_active_super_admin_statement()
RETURNS trigger AS $$
DECLARE
    active_count INT;
BEGIN
    SELECT COUNT(*)::INT INTO active_count
    FROM employees
    WHERE role = 'super_admin' AND is_active = true;

    IF active_count < 1 THEN
        RAISE EXCEPTION 'Cannot remove the last active super admin. At least one active super admin must exist in the system.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_super_admin_statement ON employees;
CREATE TRIGGER trg_protect_super_admin_statement
AFTER UPDATE OR DELETE ON employees
FOR EACH STATEMENT
EXECUTE FUNCTION verify_active_super_admin_statement();

-- 4. Statement-level trigger on users table for cascade delete defense
DROP TRIGGER IF EXISTS trg_protect_super_admin_users_cascade ON users;
CREATE TRIGGER trg_protect_super_admin_users_cascade
AFTER DELETE ON users
FOR EACH STATEMENT
EXECUTE FUNCTION verify_active_super_admin_statement();
