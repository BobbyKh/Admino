import { db, closeDb } from "../lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id) ON DELETE SET NULL`);
  console.log("✔ Added site_id to admin_users");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => closeDb(db));
