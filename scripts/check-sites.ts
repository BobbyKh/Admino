import { db } from "../lib/db/client";
import { sites, settings, homeSections, navLinks, galleryImages, menuItems, menuCategories } from "../lib/db/schema-postgres";
import { eq, asc, desc } from "drizzle-orm";

async function main() {
  const allSites = await db.select().from(sites);
  console.log("All sites:");
  for (const s of allSites) {
    console.log(`  id=${s.id} slug=${s.slug} name=${s.name} domain=${s.domain}`);
  }

  // Check siteId=5 admino settings for reference
  const adminoSettings = await db.select().from(settings).where(eq(settings.siteId, 5));
  const adminoSections = await db.select().from(homeSections).where(eq(homeSections.siteId, 5));
  console.log(`\nAdmino (siteId=5): settings=${adminoSettings.length} sections=${adminoSections.length}`);

  // Check if site 3 exists
  const site3 = allSites.find(s => s.id === 3);
  if (!site3) {
    console.log("\nSite 3 does not exist!");
  } else {
    const s3Settings = await db.select().from(settings).where(eq(settings.siteId, 3));
    console.log(`\nSite 3 (${site3.slug}): settings=${s3Settings.length}`);
  }

  // Check site 4
  const site4 = allSites.find(s => s.id === 4);
  if (!site4) {
    console.log("Site 4 does not exist!");
  } else {
    const s4Settings = await db.select().from(settings).where(eq(settings.siteId, 4));
    console.log(`Site 4 (${site4.slug}): settings=${s4Settings.length}`);
  }

  // Check for null siteId data
  const nullSettings = await db.select().from(settings).where(eq(settings.siteId, null));
  const nullSections = await db.select().from(homeSections).where(eq(homeSections.siteId, null));
  const nullNavs = await db.select().from(navLinks).where(eq(navLinks.siteId, null));
  const nullGal = await db.select().from(galleryImages).where(eq(galleryImages.siteId, null));
  const nullMenu = await db.select().from(menuItems).where(eq(menuItems.siteId, null));
  const nullCats = await db.select().from(menuCategories).where(eq(menuCategories.siteId, null));
  console.log(`\nNULL siteId data: settings=${nullSettings.length} sections=${nullSections.length} navlinks=${nullNavs.length} gallery=${nullGal.length} menu=${nullMenu.length} categories=${nullCats.length}`);

  // Check admin_users
  const { adminUsers } = await import("../lib/db/schema-postgres");
  const admins = await db.select().from(adminUsers);
  console.log(`\nAdmin users:`);
  for (const a of admins) {
    console.log(`  id=${a.id} email=${a.email} role=${a.role} siteId=${a.siteId}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
