import pg from "pg";

// Single shared connection pool. DATABASE_URL points to the dedicated `desopoll`
// database (its own role) on the shared CNPG PostgreSQL, or a local dev Postgres.
let pool: pg.Pool | null = null;

export function initDb(databaseUrl: string): pg.Pool {
  pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err.message);
  });
  return pool;
}

export function db(): pg.Pool {
  if (!pool) throw new Error("Database pool not initialized — call initDb() first");
  return pool;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
