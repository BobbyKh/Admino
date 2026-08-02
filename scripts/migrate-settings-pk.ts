/**
 * Migration: Change settings table from single-PK (key) to serial id + unique(key, site_id).
 */
import { db, closeDb } from "../lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Migrating settings table…");

  // 1. Add new serial id column
  await db.execute(sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS id SERIAL`);

  // 2. Set sequence value for existing rows
  await db.execute(sql`SELECT setval('settings_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM settings))`);

  // 3. Drop old primary key
  await db.execute(sql`ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey`);

  // 4. Set id as primary key
  await db.execute(sql`ALTER TABLE settings ADD PRIMARY KEY (id)`);

  // 5. Add unique constraint on (key, site_id)
  await db.execute(sql`ALTER TABLE settings ADD CONSTRAINT settings_key_site_unique UNIQUE (key, site_id)`);

  console.log("✔ Settings table migrated successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeDb(db));
