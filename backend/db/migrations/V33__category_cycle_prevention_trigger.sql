-- Fix 8.7 / D7: serialize category writes and reject cycles after each statement.
-- Flyway runs this migration in one transaction. Readers remain available while
-- the table lock prevents a writer from racing the preflight and trigger install.
LOCK TABLE categories IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  bad_category_id integer;
BEGIN
  -- The visited path makes this preflight terminate even on already-corrupt data.
  WITH RECURSIVE ancestors AS (
    SELECT category_id AS start_id, category_id, parent_category_id,
           ARRAY[category_id] AS visited, false AS cyclic
    FROM categories
    UNION ALL
    SELECT a.start_id, c.category_id, c.parent_category_id,
           a.visited || c.category_id, c.category_id = ANY(a.visited)
    FROM ancestors a
    JOIN categories c ON c.category_id = a.parent_category_id
    WHERE NOT a.cyclic
  )
  SELECT start_id INTO bad_category_id
  FROM ancestors WHERE cyclic LIMIT 1;

  IF bad_category_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Existing circular category hierarchy',
      DETAIL = format('Cycle reachable from category_id %s', bad_category_id),
      CONSTRAINT = 'categories_acyclic_parent';
  END IF;
END;
$$;

CREATE FUNCTION lock_category_hierarchy_writes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- READ COMMITTED gives the post-lock query a fresh snapshot. Other isolation
  -- levels are rejected rather than allowing a stale-snapshot write skew.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Category hierarchy writes require READ COMMITTED isolation',
      CONSTRAINT = 'categories_acyclic_parent';
  END IF;

  -- All INSERT/UPDATE statements take this transaction-scoped lock before any
  -- row is changed. Opposite concurrent reparentings therefore run in sequence.
  PERFORM pg_advisory_xact_lock(695945476, 87);
  RETURN NULL;
END;
$$;

CREATE FUNCTION reject_category_id_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = 'P0001',
    MESSAGE = 'category_id cannot be changed',
    CONSTRAINT = 'categories_id_immutable';
END;
$$;

CREATE FUNCTION verify_category_hierarchy_statement()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  bad_category_id integer;
BEGIN
  -- A statement-level check sees the full result of a multi-row UPDATE. The
  -- path guard also prevents nontermination if a corrupt cycle is encountered.
  WITH RECURSIVE ancestors AS (
    SELECT category_id AS start_id, category_id, parent_category_id,
           ARRAY[category_id] AS visited, false AS cyclic
    FROM changed_categories
    UNION ALL
    SELECT a.start_id, c.category_id, c.parent_category_id,
           a.visited || c.category_id, c.category_id = ANY(a.visited)
    FROM ancestors a
    JOIN categories c ON c.category_id = a.parent_category_id
    WHERE NOT a.cyclic
  )
  SELECT start_id INTO bad_category_id
  FROM ancestors WHERE cyclic LIMIT 1;

  IF bad_category_id IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001',
      MESSAGE = 'Circular category hierarchy',
      DETAIL = format('Cycle reachable from category_id %s', bad_category_id),
      CONSTRAINT = 'categories_acyclic_parent';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_categories_lock_writes
BEFORE INSERT OR UPDATE ON categories
FOR EACH STATEMENT EXECUTE FUNCTION lock_category_hierarchy_writes();

CREATE TRIGGER trg_categories_id_immutable
BEFORE UPDATE OF category_id ON categories
FOR EACH ROW WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id)
EXECUTE FUNCTION reject_category_id_change();

CREATE TRIGGER trg_categories_check_insert
AFTER INSERT ON categories
REFERENCING NEW TABLE AS changed_categories
FOR EACH STATEMENT EXECUTE FUNCTION verify_category_hierarchy_statement();

CREATE TRIGGER trg_categories_check_update
AFTER UPDATE ON categories
REFERENCING NEW TABLE AS changed_categories
FOR EACH STATEMENT EXECUTE FUNCTION verify_category_hierarchy_statement();
