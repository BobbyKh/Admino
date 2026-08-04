import { eq } from "drizzle-orm";
import { db, closeDb } from "../lib/db/client";
import { settings, sites } from "../lib/db/schema";
import { createEcommerceTemplate } from "../lib/default-ecommerce";

async function main() {
  const ecommerceSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.template, "ecommerce"));

  for (const site of ecommerceSites) {
    const [existingSetting] = await db
      .select({ id: settings.id })
      .from(settings)
      .where(eq(settings.siteId, site.id));
    if (!existingSetting) {
      await createEcommerceTemplate(site.id, site.name, true);
      console.log(`Provisioned ecommerce template for ${site.name}.`);
    }
  }

  await closeDb(db);
}

main().catch(async (error) => {
  console.error("Failed to provision ecommerce templates:", error);
  await closeDb(db);
  process.exitCode = 1;
});
