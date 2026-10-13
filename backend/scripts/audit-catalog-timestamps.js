require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const target = await client.query("SELECT current_database() AS database, current_setting('server_version') AS version, to_regclass('public.flyway_schema_history') AS history");
    const triggers = await client.query(`
      SELECT c.relname AS table_name, t.tgname AS trigger_name,
             p.proname AS function_name, t.tgenabled,
             pg_get_triggerdef(t.oid) AS definition
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE n.nspname = 'public'
        AND c.relname IN ('products', 'product_variants')
        AND NOT t.tgisinternal AND t.tgname LIKE 'trg_%_updated_at'
      ORDER BY c.relname
    `);
    const result = { target: target.rows[0], triggers: triggers.rows };
    const isolated = await client.query("SELECT datname FROM pg_database WHERE datname LIKE 'fix82_%' ORDER BY datname");
    result.disposableTestDatabases = isolated.rows.map((row) => row.datname);
    if (target.rows[0].history) {
      const history = await client.query("SELECT version, description, success, installed_on FROM flyway_schema_history WHERE version IN ('26', '27', '28') ORDER BY installed_rank");
      result.migrations = history.rows;
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
