import { db, closeDb } from "../lib/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const res = await db.execute(sql`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'nav_links' ORDER BY ordinal_position`);
  console.log("nav_links columns:", res.rows);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => closeDb(db));
