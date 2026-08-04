import { db, closeDb } from "../lib/db/client";
import { sites } from "../lib/db/schema";
import { createDefaultHomepage } from "../lib/default-homepage";
import { createDefaultNavigation } from "../lib/default-navigation";

async function main() {
  const allSites = await db.select({ id: sites.id }).from(sites);
  for (const site of allSites) {
    await createDefaultHomepage(site.id);
    await createDefaultNavigation(site.id);
  }
  await closeDb(db);
}

main().catch(async (error) => {
  console.error("Failed to provision homepages:", error);
  await closeDb(db);
  process.exitCode = 1;
});
