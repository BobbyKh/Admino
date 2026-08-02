/**
 * Seed script — creates demo ecommerce content for the anish-faancy site (id: 2).
 * Usage: bunx tsx scripts/seed-ecommerce.ts
 */
import { eq } from "drizzle-orm";
import { db, closeDb } from "../lib/db/client";
import {
  galleryImages,
  homeSections,
  menuCategories,
  menuItems,
  navLinks,
  settings,
  sites,
} from "../lib/db/schema";
import { DEFAULT_SETTINGS } from "../lib/settings";

async function main() {
  // Create or get the anish-faancy site
  const [existingSite] = await db.select().from(sites).where(eq(sites.slug, "anish-faancy"));
  let SITE_ID = existingSite?.id;
  if (!SITE_ID) {
    const [newSite] = await db.insert(sites).values({
      name: "Anish Faancy",
      slug: "anish-faancy",
      template: "ecommerce",
      published: true,
    }).returning();
    SITE_ID = newSite.id;
  }
  console.log(`Seeding ecommerce demo for site ${SITE_ID}…`);

  // Seed settings
  const ecomSettings: Record<string, string> = {
    ...DEFAULT_SETTINGS,
    siteName: "Anish Faancy",
    tagline: "Premium Fashion & Lifestyle",
    heroTitle: "Discover Your Style",
    heroSubtitle: "Curated fashion for the modern lifestyle. Free shipping on orders over NPR 5,000.",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    phone: "+977 984-1234567",
    email: "hello@anishfaancy.com",
    address: "New Baneshwor, Kathmandu, Nepal",
    hours: "Sun–Fri 10 AM – 9 PM",
    priceRange: "NPR 500–5,000",
    rating: "4.8",
    reviewCount: "324",
    mapQuery: "New Baneshwor, Kathmandu",
    features: JSON.stringify([
      "Free Shipping Over NPR 5,000",
      "7-Day Returns",
      "Secure Payment",
      "24/7 Support",
    ]),
    services: JSON.stringify([
      "In-Store Shopping",
      "Online Orders",
      "Gift Wrapping",
      "Loyalty Program",
      "Personal Styling",
    ]),
  };

  for (const [key, value] of Object.entries(ecomSettings)) {
    const now = new Date().toISOString();
    await db
      .insert(settings)
      .values({ key, siteId: SITE_ID, value, updatedAt: now })
      .onConflictDoUpdate({
        target: [settings.key, settings.siteId],
        set: { value, updatedAt: now },
      });
  }
  console.log("✔ Settings seeded");

  // Seed navigation links
  const existingLinks = await db.select().from(navLinks).where(eq(navLinks.siteId, SITE_ID));
  if (existingLinks.length === 0) {
    const links = [
      { label: "Home", href: "/", sortOrder: 0 },
      { label: "Shop", href: "/menu", sortOrder: 1 },
      { label: "Gallery", href: "/gallery", sortOrder: 2 },
      { label: "About", href: "/contact", sortOrder: 3 },
    ];
    for (const link of links) {
      await db.insert(navLinks).values({ ...link, siteId: SITE_ID, visible: true, external: false });
    }
    console.log(`✔ Seeded ${links.length} navigation links`);
  } else {
    console.log(`✔ Navigation already has ${existingLinks.length} links`);
  }

  // Seed product categories
  const existingCats = await db.select().from(menuCategories).where(eq(menuCategories.siteId, SITE_ID));
  if (existingCats.length === 0) {
    const categories = [
      { name: "T-Shirts", slug: "tshirts", description: "Premium cotton tees for everyday wear", sortOrder: 0 },
      { name: "Shirts", slug: "shirts", description: "Casual & formal shirts", sortOrder: 1 },
      { name: "Pants", slug: "pants", description: "Jeans, chinos & trousers", sortOrder: 2 },
      { name: "Accessories", slug: "accessories", description: "Watches, bags & more", sortOrder: 3 },
    ];
    for (const c of categories) {
      await db.insert(menuCategories).values({ ...c, siteId: SITE_ID });
    }

    const catIdFor = async (slug: string) => {
      const [row] = await db.select().from(menuCategories).where(eq(menuCategories.slug, slug));
      return row!.id;
    };

    const products = [
      // T-Shirts
      { categoryId: await catIdFor("tshirts"), name: "Classic White Tee", description: "100% organic cotton, relaxed fit. A wardrobe essential.", price: 1200, featured: true, sortOrder: 0 },
      { categoryId: await catIdFor("tshirts"), name: "Navy Polo Tee", description: "Piqué cotton polo with embroidered logo.", price: 1800, featured: false, sortOrder: 1 },
      { categoryId: await catIdFor("tshirts"), name: "Black Oversized Tee", description: "Heavyweight cotton, drop-shoulder silhouette.", price: 1500, featured: true, sortOrder: 2 },
      { categoryId: await catIdFor("tshirts"), name: "Striped Crew Neck", description: "French terry cotton, horizontal stripes.", price: 1400, featured: false, sortOrder: 3 },
      // Shirts
      { categoryId: await catIdFor("shirts"), name: "Oxford Button-Down", description: "Classic oxford cloth, button-down collar. Perfect for layering.", price: 2800, featured: true, sortOrder: 0 },
      { categoryId: await catIdFor("shirts"), name: "Linen Summer Shirt", description: "Breathable linen, camp collar. Ideal for warm days.", price: 3200, featured: false, sortOrder: 1 },
      { categoryId: await catIdFor("shirts"), name: "Flannel Check Shirt", description: "Soft brushed flannel in a timeless check pattern.", price: 2500, featured: false, sortOrder: 2 },
      { categoryId: await catIdFor("shirts"), name: "Denim Western Shirt", description: "Rigid denim with pearl snap buttons.", price: 3500, featured: true, sortOrder: 3 },
      // Pants
      { categoryId: await catIdFor("pants"), name: "Slim Fit Jeans", description: "Stretch denim, dark indigo wash. Modern slim cut.", price: 3800, featured: true, sortOrder: 0 },
      { categoryId: await catIdFor("pants"), name: "Chino Trousers", description: "Garment-dyed cotton twill. Smart casual essential.", price: 3200, featured: false, sortOrder: 1 },
      { categoryId: await catIdFor("pants"), name: "Cargo Joggers", description: "Elasticated cargo with utility pockets.", price: 2800, featured: false, sortOrder: 2 },
      { categoryId: await catIdFor("pants"), name: "Pleated Wide Leg", description: "High-rise wide leg with front pleats.", price: 4200, featured: true, sortOrder: 3 },
      // Accessories
      { categoryId: await catIdFor("accessories"), name: "Minimal Leather Watch", description: "Japanese quartz movement, genuine leather strap.", price: 4800, featured: true, sortOrder: 0 },
      { categoryId: await catIdFor("accessories"), name: "Canvas Tote Bag", description: "Heavy-duty canvas with leather handles.", price: 2200, featured: false, sortOrder: 1 },
      { categoryId: await catIdFor("accessories"), name: "Wool Beanie", description: "Merino wool knit, one size fits all.", price: 900, featured: false, sortOrder: 2 },
      { categoryId: await catIdFor("accessories"), name: "Leather Belt", description: "Full-grain leather, brushed silver buckle.", price: 1800, featured: true, sortOrder: 3 },
    ];
    for (const item of products) {
      await db.insert(menuItems).values({ ...item, siteId: SITE_ID, available: true });
    }
    console.log(`✔ Seeded ${products.length} products`);
  } else {
    console.log(`✔ Menu already has ${existingCats.length} categories`);
  }

  // Seed gallery
  const existingGallery = await db.select().from(galleryImages).where(eq(galleryImages.siteId, SITE_ID));
  if (existingGallery.length === 0) {
    const photos = [
      { title: "Storefront", category: "Store", src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80" },
      { title: "Display Wall", category: "Store", src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Summer Collection", category: "Collection", src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1200&q=80" },
      { title: "Accessories Display", category: "Products", src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80" },
      { title: "Fitting Room", category: "Store", src: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=1200&q=80" },
      { title: "Casual Look", category: "Collection", src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80" },
      { title: "Denim Edit", category: "Collection", src: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Watch Collection", category: "Products", src: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80" },
    ];
    for (const [i, p] of photos.entries()) {
      await db.insert(galleryImages).values({
        siteId: SITE_ID,
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
    console.log(`✔ Gallery already has ${existingGallery.length} images`);
  }

  // Seed homepage sections
  const existingSections = await db.select().from(homeSections).where(eq(homeSections.siteId, SITE_ID));
  if (existingSections.length === 0) {
    const sections = [
      { type: "hero", title: null, sortOrder: 0 },
      { type: "features", title: null, sortOrder: 1 },
      { type: "about", title: null, sortOrder: 2 },
      { type: "menuPreview", title: null, sortOrder: 3 },
      { type: "gallery", title: null, sortOrder: 4 },
      { type: "cta", title: null, sortOrder: 5 },
    ];
    for (const section of sections) {
      await db.insert(homeSections).values({
        ...section,
        siteId: SITE_ID,
        visible: true,
        config: null,
      });
    }
    console.log(`✔ Seeded ${sections.length} homepage sections`);
  } else {
    console.log(`✔ Homepage already has ${existingSections.length} sections`);
  }

  console.log("✔ Ecommerce seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeDb(db));
