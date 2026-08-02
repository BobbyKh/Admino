/**
 * Seed script — creates admin user, default site, default settings, gallery and menu.
 * Requires PostgreSQL with DATABASE_URL set.
 * Usage: bun run db:seed
 */
import { eq } from "drizzle-orm";
import { db, closeDb } from "../lib/db/client";
import { hashPassword } from "../lib/password";
import { DEFAULT_SETTINGS } from "../lib/settings";
import {
  adminUsers,
  galleryImages,
  homeSections,
  menuCategories,
  menuItems,
  navLinks,
  pages,
  pageBlocks,
  settings,
  sites,
} from "../lib/db/schema";

async function main() {
  console.log("Seeding PostgreSQL database…");

  // Seed default site
  const [existingSite] = await db.select().from(sites).where(eq(sites.slug, "default"));
  let siteId = existingSite?.id;
  if (!siteId) {
    const [newSite] = await db.insert(sites).values({
      name: process.env.SITE_NAME ?? "Maiti Resort",
      slug: "default",
      template: "restaurant",
      published: true,
    }).returning();
    siteId = newSite.id;
  }
  console.log(`✔ Site ready (id: ${siteId})`);

  // Seed settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const now = new Date().toISOString();
    await db
      .insert(settings)
      .values({ key, siteId, value, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      });
  }
  console.log("✔ Settings seeded");

  // Seed admin user (idempotent)
  const email = (process.env.ADMIN_EMAIL ?? "admin@maitiresort.com").toLowerCase();
  const [existing] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email));
  if (!existing) {
    const password = process.env.ADMIN_PASSWORD ?? "maiti2024";
    await db.insert(adminUsers).values({
      name: "Maiti Admin",
      email,
      passwordHash: await hashPassword(password),
    });
    console.log(`✔ Seeded admin user: ${email} (password: ${password})`);
  } else {
    console.log(`✔ Admin user already exists: ${email}`);
  }

  // Seed gallery
  const gallery = await db.select().from(galleryImages);
  if (gallery.length === 0) {
    const photos = [
      { title: "Our Dining Hall", category: "Resort", src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80" },
      { title: "Outdoor Seating", category: "Resort", src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80" },
      { title: "Fresh Momos", category: "Food", src: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Nepali Thali", category: "Food", src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80" },
      { title: "Evening Coffee", category: "Food", src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80" },
      { title: "Garden View", category: "Resort", src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80" },
      { title: "Dessert Platter", category: "Food", src: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80" },
      { title: "Family Gathering", category: "Events", src: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=80" },
      { title: "Cold Drinks", category: "Food", src: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80" },
      { title: "Sunset at the Resort", category: "Resort", src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80" },
    ];
    for (const [i, p] of photos.entries()) {
      await db.insert(galleryImages).values({
        siteId,
        title: p.title,
        alt: p.title,
        src: p.src,
        category: p.category,
        featured: i < 4,
        sortOrder: i,
      });
    }
    console.log(`✔ Seeded ${photos.length} gallery images`);
  } else {
    console.log(`✔ Gallery already has ${gallery.length} images`);
  }

  // Seed menu
  const cats = await db.select().from(menuCategories);
  if (cats.length === 0) {
    const categories = [
      { name: "Breakfast", slug: "breakfast", description: "Start your day right", sortOrder: 1 },
      { name: "Lunch & Dinner", slug: "lunch-dinner", description: "Hearty Nepali & continental dishes", sortOrder: 2 },
      { name: "Desserts", slug: "desserts", description: "Sweet endings", sortOrder: 3 },
      { name: "Coffee & Bar", slug: "coffee-bar", description: "Coffee, beer & wine", sortOrder: 4 },
    ];
    for (const c of categories) {
      await db.insert(menuCategories).values({ ...c, siteId });
    }
    const idFor = async (slug: string) => {
      const [row] = await db
        .select()
        .from(menuCategories)
        .where(eq(menuCategories.slug, slug));
      if (!row) throw new Error(`Category not found: ${slug}`);
      return row.id;
    };

    const items = [
      { categoryId: await idFor("breakfast"), name: "Sel Roti with Achar", description: "Traditional Nepali rice roti served with spicy pickle.", price: 150, featured: true, sortOrder: 1 },
      { categoryId: await idFor("breakfast"), name: "Puri Tarkari", description: "Crispy puris with mixed vegetable curry.", price: 180, featured: false, sortOrder: 2 },
      { categoryId: await idFor("breakfast"), name: "Masala Omelette", description: "Fluffy omelette with onions, tomatoes & chillies, served with toast.", price: 220, featured: false, sortOrder: 3 },
      { categoryId: await idFor("breakfast"), name: "Continental Breakfast", description: "Eggs any style, sausages, toast, butter & jam with tea or coffee.", price: 450, featured: false, sortOrder: 4 },
      { categoryId: await idFor("lunch-dinner"), name: "Chicken Momo (Steam/Fried)", description: "Juicy chicken dumplings with sesame-tomato achar.", price: 250, featured: true, sortOrder: 1 },
      { categoryId: await idFor("lunch-dinner"), name: "Veg Thukpa", description: "Noodle soup with seasonal vegetables in a warm broth.", price: 300, featured: false, sortOrder: 2 },
      { categoryId: await idFor("lunch-dinner"), name: "Nepali Khaja Set", description: "Rice, dal, seasonal vegetables, achar & curry of the day.", price: 500, featured: true, sortOrder: 3 },
      { categoryId: await idFor("lunch-dinner"), name: "Chicken Chowmein", description: "Wok-tossed noodles with chicken and garden vegetables.", price: 280, featured: false, sortOrder: 4 },
      { categoryId: await idFor("lunch-dinner"), name: "Mutton Sekuwa", description: "Char-grilled spiced mutton skewers with pickled onions.", price: 650, featured: true, sortOrder: 5 },
      { categoryId: await idFor("lunch-dinner"), name: "Veg Fried Rice", description: "Seasonal vegetables tossed with fragrant basmati rice.", price: 250, featured: false, sortOrder: 6 },
      { categoryId: await idFor("desserts"), name: "Juju Dhau", description: "Creamy sweet curd — a Bhaktapur special.", price: 150, featured: true, sortOrder: 1 },
      { categoryId: await idFor("desserts"), name: "Gulab Jamun", description: "Warm milk dumplings soaked in rose syrup.", price: 180, featured: false, sortOrder: 2 },
      { categoryId: await idFor("desserts"), name: "Fruit Salad with Ice Cream", description: "Seasonal fruits topped with a scoop of ice cream.", price: 250, featured: false, sortOrder: 3 },
      { categoryId: await idFor("coffee-bar"), name: "Nepali Coffee", description: "Rich, locally grown coffee, brewed to order.", price: 200, featured: false, sortOrder: 1 },
      { categoryId: await idFor("coffee-bar"), name: "Masala Chai", description: "Spiced milk tea brewed the Nepali way.", price: 120, featured: true, sortOrder: 2 },
      { categoryId: await idFor("coffee-bar"), name: "Local Beer (650ml)", description: "Chilled Nepali lager.", price: 450, featured: false, sortOrder: 3 },
      { categoryId: await idFor("coffee-bar"), name: "House Wine (Glass)", description: "Red or white, served by the glass.", price: 500, featured: false, sortOrder: 4 },
    ];
    for (const item of items) {
      await db.insert(menuItems).values({ ...item, siteId });
    }
    console.log(`✔ Seeded ${items.length} menu items`);
  } else {
    console.log(`✔ Menu already has ${cats.length} categories`);
  }

  // Seed navigation links
  const existingLinks = await db.select().from(navLinks);
  if (existingLinks.length === 0) {
    const links = [
      { label: "Home", href: "/", sortOrder: 0 },
      { label: "Menu", href: "/menu", sortOrder: 1 },
      { label: "Gallery", href: "/gallery", sortOrder: 2 },
      { label: "Book a Table", href: "/book", sortOrder: 3 },
      { label: "Contact", href: "/contact", sortOrder: 4 },
    ];
    for (const link of links) {
      await db.insert(navLinks).values({ ...link, siteId, visible: true, external: false });
    }
    console.log(`✔ Seeded ${links.length} navigation links`);
  } else {
    console.log(`✔ Navigation already has ${existingLinks.length} links`);
  }

  // Seed homepage sections
  const existingSections = await db.select().from(homeSections);
  if (existingSections.length === 0) {
    const sections = [
      { type: "hero", title: null, sortOrder: 0 },
      { type: "features", title: null, sortOrder: 1 },
      { type: "about", title: null, sortOrder: 2 },
      { type: "video", title: null, sortOrder: 3 },
      { type: "menuPreview", title: null, sortOrder: 4 },
      { type: "gallery", title: null, sortOrder: 5 },
      { type: "cta", title: null, sortOrder: 6 },
    ];
    for (const section of sections) {
      await db.insert(homeSections).values({
        ...section,
        siteId,
        visible: section.type !== "video",
        config: null,
      });
    }
    console.log(`✔ Seeded ${sections.length} homepage sections`);
  } else {
    console.log(`✔ Homepage already has ${existingSections.length} sections`);
  }

  // Seed default homepage for the new page builder system
  const [existingPage] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, "home"));
  if (!existingPage) {
    const [homePage] = await db
      .insert(pages)
      .values({
        siteId,
        title: "Home",
        slug: "home",
        description: "Homepage",
        template: "default",
        published: true,
        sortOrder: 0,
      })
      .returning();
    console.log(`✔ Seeded homepage (id: ${homePage.id})`);

    const pageSections = [
      { type: "hero", title: null, sortOrder: 0, config: null },
      { type: "features", title: null, sortOrder: 1, config: null },
      { type: "about", title: null, sortOrder: 2, config: null },
      { type: "menuPreview", title: null, sortOrder: 3, config: null },
      { type: "gallery", title: null, sortOrder: 4, config: null },
      { type: "cta", title: null, sortOrder: 5, config: null },
    ];
    for (const block of pageSections) {
      await db.insert(pageBlocks).values({
        pageId: homePage.id,
        ...block,
        visible: true,
      });
    }
    console.log(`✔ Seeded ${pageSections.length} page blocks for homepage`);
  } else {
    console.log(`✔ Homepage already exists`);
  }

  console.log("✔ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeDb(db));
