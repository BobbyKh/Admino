import { db } from "../lib/db/client";
import {
  sites, settings, homeSections, navLinks, galleryImages, menuItems, menuCategories,
} from "../lib/db/schema-postgres";
import { eq } from "drizzle-orm";

async function main() {
  // Check what siteId=1 has
  const site1Sections = await db.select().from(homeSections).where(eq(homeSections.siteId, 1));
  const site1Settings = await db.select().from(settings).where(eq(settings.siteId, 1));
  const site1Navs = await db.select().from(navLinks).where(eq(navLinks.siteId, 1));
  const site1Gal = await db.select().from(galleryImages).where(eq(galleryImages.siteId, 1));
  const site1Menu = await db.select().from(menuItems).where(eq(menuItems.siteId, 1));
  const site1Cats = await db.select().from(menuCategories).where(eq(menuCategories.siteId, 1));
  console.log(`SiteId=1: sections=${site1Sections.length} settings=${site1Settings.length} navlinks=${site1Navs.length} gallery=${site1Gal.length} menu=${site1Menu.length} categories=${site1Cats.length}`);

  // Migrate siteId=1 data to siteId=3 (default / Maiti Resort)
  const TARGET = 3;
  console.log(`\nMigrating siteId=1 data to siteId=${TARGET}...`);

  // Settings
  for (const row of site1Settings) {
    const existing = await db.select().from(settings)
      .where(eq(settings.key, row.key)).then(rows => rows.filter(r => r.siteId === TARGET));
    if (existing.length === 0) {
      await db.insert(settings).values({ key: row.key, value: row.value, siteId: TARGET });
    }
  }
  console.log(`  Settings migrated`);

  // Home sections
  for (const row of site1Sections) {
    await db.insert(homeSections).values({
      type: row.type, title: row.title, sortOrder: row.sortOrder,
      visible: row.visible, config: row.config, siteId: TARGET,
    });
  }
  console.log(`  Home sections migrated: ${site1Sections.length}`);

  // Nav links
  for (const row of site1Navs) {
    await db.insert(navLinks).values({
      label: row.label, href: row.href, sortOrder: row.sortOrder,
      visible: row.visible, external: row.external, siteId: TARGET,
    });
  }
  console.log(`  Nav links migrated: ${site1Navs.length}`);

  // Gallery
  for (const row of site1Gal) {
    await db.insert(galleryImages).values({
      src: row.src, alt: row.alt, sortOrder: row.sortOrder,
      visible: row.visible, siteId: TARGET,
    });
  }
  console.log(`  Gallery migrated: ${site1Gal.length}`);

  // Menu categories
  const catIdMap = new Map<number, number>();
  for (const row of site1Cats) {
    const [ins] = await db.insert(menuCategories).values({
      name: row.name, sortOrder: row.sortOrder, siteId: TARGET,
    }).returning({ id: menuCategories.id });
    catIdMap.set(row.id, ins.id);
  }
  console.log(`  Menu categories migrated: ${site1Cats.length}`);

  // Menu items
  for (const row of site1Menu) {
    const newCategoryId = row.categoryId ? catIdMap.get(row.categoryId) : undefined;
    await db.insert(menuItems).values({
      name: row.name, description: row.description, price: row.price,
      image: row.image, featured: row.featured, sortOrder: row.sortOrder,
      categoryId: newCategoryId ?? null, siteId: TARGET,
    });
  }
  console.log(`  Menu items migrated: ${site1Menu.length}`);

  console.log("\nDone!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
