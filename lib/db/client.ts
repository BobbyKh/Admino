import { config } from "dotenv";
import { Pool } from "pg";
import { drizzle as pgDrizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as pgSchema from "./schema-postgres";

// Load .env.local for scripts (tsx, seed, etc.)
config({ path: ".env.local" });

/**
 * PostgreSQL-only DB client.
 * Requires DATABASE_URL to be set to a postgres:// connection string.
 *
 * NOTE: no `server-only` import here so scripts (seed) can reuse this module.
 */
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required. Set it to a postgres:// connection string.");
}

export type Db = NodePgDatabase<typeof pgSchema>;

const globalForDb = globalThis as unknown as { db?: Db };

export function createDb(): Db {
  const pool = new Pool({ connectionString: DATABASE_URL });
  return pgDrizzle(pool, { schema: pgSchema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

/** Closes the underlying client (used by scripts, not Next request handlers). */
export async function closeDb(dbClient: Db) {
  const client = (dbClient as unknown as {
    $client?: { end?: () => Promise<void> };
  }).$client;
  if (!client) return;
  await client.end?.();
}
