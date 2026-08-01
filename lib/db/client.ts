import Database from "better-sqlite3";
import { drizzle as sqliteDrizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { Pool } from "pg";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import * as sqliteSchema from "./schema-sqlite";
import * as pgSchema from "./schema-postgres";

/**
 * Unified async DB client.
 * - Local / development → better-sqlite3 (SQLite file, sync but awaitable).
 * - Production → node-postgres (PostgreSQL), enabled by a `postgres://` DATABASE_URL.
 * App code always awaits queries, so both drivers behave identically.
 *
 * NOTE: no `server-only` import here so scripts (seed) can reuse this module.
 */
export const isPostgres = (process.env.DATABASE_URL ?? "").startsWith("postgres");

export type Db = BetterSQLite3Database<typeof sqliteSchema>;

const globalForDb = globalThis as unknown as { db?: Db };

export function createDb(): Db {
  if (isPostgres) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return pgDrizzle(pool, { schema: pgSchema }) as unknown as Db;
  }
  const sqlite = new Database(process.env.DATABASE_URL ?? "./maiti.db");
  sqlite.pragma("journal_mode = WAL");
  return sqliteDrizzle(sqlite, { schema: sqliteSchema });
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

/** Closes the underlying client (used by scripts, not Next request handlers). */
export async function closeDb(dbClient: Db) {
  const client = (dbClient as unknown as {
    $client?: { close?: () => void; end?: () => Promise<void> };
  }).$client;
  if (!client) return;
  if (isPostgres) await client.end?.();
  else client.close?.();
}
