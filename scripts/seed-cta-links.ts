/**
 * Seed script — adds heroCtaPrimaryLink and heroCtaSecondaryLink to all existing sites.
 */
import { db, closeDb } from "../lib/db/client";
import { settings } from "../lib/db/schema-postgres";
import { eq, and } from "drizzle-orm";

async function main() {
  const sites = await db.selectDistinct({ siteId: settings.siteId }).from(settings);
  console.log("Sites with settings:", sites);

  for (const { siteId } of sites) {
    for (const [key, defaultVal] of [
      ["heroCtaPrimaryLink", "/contact"],
      ["heroCtaSecondaryLink", "/gallery"],
    ] as const) {
      const existing = await db
        .select()
        .from(settings)
        .where(and(eq(settings.key, key), eq(settings.siteId, siteId)));
      if (existing.length === 0) {
        await db.insert(settings).values({ key, value: defaultVal, siteId });
        console.log(`Inserted ${key}=${defaultVal} for siteId=${siteId}`);
      } else {
        console.log(`Already exists ${key} for siteId=${siteId}`);
      }
    }
  }

  await closeDb(db);
  console.log("Done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
