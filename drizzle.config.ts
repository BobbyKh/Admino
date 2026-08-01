import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
const isPostgres = DATABASE_URL.startsWith("postgres");

/**
 * Branching config: local dev uses SQLite (schema-sqlite.ts), production uses
 * PostgreSQL (schema-postgres.ts) when DATABASE_URL points at Postgres.
 */
export default isPostgres
  ? defineConfig({
      schema: "./lib/db/schema-postgres.ts",
      out: "./drizzle-pg",
      dialect: "postgresql",
      dbCredentials: {
        url: DATABASE_URL,
      },
    })
  : defineConfig({
      schema: "./lib/db/schema-sqlite.ts",
      out: "./drizzle",
      dialect: "sqlite",
      dbCredentials: {
        url: DATABASE_URL || "./maiti.db",
      },
    });
