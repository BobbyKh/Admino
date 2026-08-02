import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load .env.local manually since drizzle-kit doesn't auto-load it
config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL ?? "";

if (!DATABASE_URL.startsWith("postgres")) {
  throw new Error(
    "DATABASE_URL must start with 'postgres' or 'postgresql'. " +
    "Set it in .env.local or as an environment variable."
  );
}

export default defineConfig({
  schema: "./lib/db/schema-postgres.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
