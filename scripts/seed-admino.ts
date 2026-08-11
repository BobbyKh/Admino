/**
 * Seed script — creates the Admino platform site (the main landing page).
 * Visitors see this site and sign up as tenants.
 * Usage: bunx tsx scripts/seed-admino.ts
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
  adminUsers,
} from "../lib/db/schema";
import { hashPassword } from "../lib/password";

async function main() {
  // Create or get the admino site
  const [existingSite] = await db.select().from(sites).where(eq(sites.slug, "admino"));
  let SITE_ID = existingSite?.id;
  if (!SITE_ID) {
    const [newSite] = await db
      .insert(sites)
      .values({
        name: "Admino",
        slug: "admino",
        description: "Build your website in minutes — no code required.",
        template: "landing",
        published: true,
      })
      .returning();
    SITE_ID = newSite.id;
  }
  console.log(`✔ Admino site ready (id: ${SITE_ID})`);

  // Seed settings
  const adminoSettings: Record<string, string> = {
    siteName: "Admino",
    tagline: "Build Your Website in Minutes",
    heroTitle: "Your Website, Your Way",
    heroSubtitle:
      "Create beautiful, professional websites without writing a single line of code. Drag, drop, and publish — it's that simple.",
    heroImage:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
    phone: "+977 980-0000000",
    email: "hello@admino.com",
    address: "Kathmandu, Nepal",
    hours: "Always online — 24/7",
    priceRange: "Free to start",
    rating: "4.9",
    reviewCount: "1,200+",
    mapQuery: "Kathmandu, Nepal",
    features: JSON.stringify([
      "Drag & Drop Builder",
      "Custom Domains",
      "SEO Optimized",
      "Mobile Responsive",
      "Fast Hosting",
      "SSL Included",
    ]),
    services: JSON.stringify([
      "Website Builder",
      "Custom Domains",
      "E-commerce Tools",
      "Blog Engine",
      "Analytics Dashboard",
      "24/7 Support",
    ]),
    themePrimary: "oklch(0.5 0.15 260)",
    themePrimaryForeground: "oklch(0.985 0 0)",
    themeSecondary: "oklch(0.945 0.02 260)",
    themeSecondaryForeground: "oklch(0.3 0.05 260)",
    themeAccent: "oklch(0.93 0.03 260)",
    themeAccentForeground: "oklch(0.3 0.06 260)",
    themeBackground: "oklch(0.99 0.002 260)",
    themeForeground: "oklch(0.16 0.02 260)",
    themeMuted: "oklch(0.955 0.01 260)",
    themeMutedForeground: "oklch(0.5 0.02 260)",
    themeBorder: "oklch(0.9 0.015 260)",
    themeRing: "oklch(0.5 0.15 260)",
    themeCard: "oklch(1 0 0)",
    themeCardForeground: "oklch(0.16 0.02 260)",
  };

  for (const [key, value] of Object.entries(adminoSettings)) {
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
  const existingLinks = await db
    .select()
    .from(navLinks)
    .where(eq(navLinks.siteId, SITE_ID));
  if (existingLinks.length === 0) {
    const links = [
      { label: "Features", href: "#features", sortOrder: 0 },
      { label: "How It Works", href: "#how-it-works", sortOrder: 1 },
      { label: "Pricing", href: "#pricing", sortOrder: 2 },
      { label: "Login", href: "/admin/login", sortOrder: 3 },
    ];
    for (const link of links) {
      await db
        .insert(navLinks)
        .values({ ...link, siteId: SITE_ID, visible: true, external: false });
    }
    console.log(`✔ Seeded ${links.length} navigation links`);
  } else {
    console.log(`✔ Navigation already has ${existingLinks.length} links`);
  }

  // Seed homepage sections
  const existingSections = await db
    .select()
    .from(homeSections)
    .where(eq(homeSections.siteId, SITE_ID));
  if (existingSections.length === 0) {
    const sections = [
      { type: "hero", title: "Build Your Website, Your Way", sortOrder: 0 },
      {
        type: "features",
        title: "Everything You Need",
        sortOrder: 1,
        config: JSON.stringify({
          items: [
            {
              title: "Drag & Drop Editor",
              description:
                "No coding required. Just drag elements where you want them and see your website come to life.",
            },
            {
              title: "Custom Domains",
              description:
                "Use your own domain name. We handle SSL and hosting so you can focus on your content.",
            },
            {
              title: "Mobile Responsive",
              description:
                "Every site looks beautiful on phones, tablets, and desktops. Automatic on every template.",
            },
            {
              title: "SEO Built In",
              description:
                "Meta tags, sitemaps, and clean URLs — all generated automatically for better rankings.",
            },
            {
              title: "E-commerce Ready",
              description:
                "Sell products online with built-in payment processing, inventory, and order management.",
            },
            {
              title: "Blazing Fast",
              description:
                "Global CDN, optimized images, and server-side rendering for lightning-fast page loads.",
            },
          ],
        }),
      },
      {
        type: "about",
        title: "How It Works",
        sortOrder: 2,
        config: JSON.stringify({
          steps: [
            {
              step: "1",
              title: "Sign Up",
              description: "Create your free account in 30 seconds. No credit card required.",
            },
            {
              step: "2",
              title: "Choose a Template",
              description:
                "Pick from restaurant, portfolio, business, blog, or e-commerce templates.",
            },
            {
              step: "3",
              title: "Customize & Publish",
              description:
                "Edit content, swap images, change colors — then hit publish. Your site is live!",
            },
          ],
        }),
      },
      {
        type: "cta",
        title: "Ready to Build?",
        sortOrder: 3,
        config: JSON.stringify({
          buttonText: "Get Started Free",
          buttonLink: "/admin/login",
          subtitle: "Join 1,200+ websites built with Admino.",
        }),
      },
    ];
    for (const section of sections) {
      await db.insert(homeSections).values({
        ...section,
        siteId: SITE_ID,
        visible: true,
      });
    }
    console.log(`✔ Seeded ${sections.length} homepage sections`);
  } else {
    console.log(`✔ Homepage already has ${existingSections.length} sections`);
  }

  // Seed a page builder page for the homepage
  const { pages, pageBlocks } = await import("../lib/db/schema");
  const [existingPage] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, "home"));
  if (!existingPage) {
    const [homePage] = await db
      .insert(pages)
      .values({
        siteId: SITE_ID,
        title: "Home",
        slug: "home",
        description: "Admino landing page",
        template: "default",
        published: true,
        sortOrder: 0,
      })
      .returning();

    const pageSections = [
      { type: "hero", title: null, sortOrder: 0, config: null },
      { type: "features", title: "Everything You Need", sortOrder: 1, config: null },
      { type: "about", title: "How It Works", sortOrder: 2, config: null },
      { type: "cta", title: "Ready to Build?", sortOrder: 3, config: null },
    ];
    for (const block of pageSections) {
      await db.insert(pageBlocks).values({
        pageId: homePage.id,
        ...block,
        visible: true,
      });
    }
    console.log(`✔ Seeded ${pageSections.length} page blocks`);
  }

  // Seed gallery (platform screenshots / mockups)
  const existingGallery = await db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.siteId, SITE_ID));
  if (existingGallery.length === 0) {
    const photos = [
      { title: "Drag & Drop Editor", category: "Product", src: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80" },
      { title: "Beautiful Templates", category: "Product", src: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&w=1200&q=80" },
      { title: "Mobile Responsive", category: "Product", src: "https://images.unsplash.com/photo-1551650975-87deedd944c3?auto=format&fit=crop&w=1200&q=80" },
      { title: "Analytics Dashboard", category: "Product", src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80" },
    ];
    for (const [i, p] of photos.entries()) {
      await db.insert(galleryImages).values({
        siteId: SITE_ID,
        title: p.title,
        alt: p.title,
        src: p.src,
        category: p.category,
        featured: i < 2,
        sortOrder: i,
      });
    }
    console.log(`✔ Seeded ${photos.length} gallery images`);
  }

  // Ensure super admin exists with correct role
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required when seeding an admin user.");
  }
  const [existingAdmin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, adminEmail));
  if (!existingAdmin) {
    await db.insert(adminUsers).values({
      name: "Admino Admin",
      email: adminEmail,
      passwordHash: await hashPassword(password),
      role: "super_admin",
      siteId: SITE_ID,
    });
    console.log(`✔ Created super admin: ${adminEmail}`);
  } else {
    console.log(`✔ Admin already exists: ${adminEmail}`);
  }

  console.log(`✔ Admino seed complete. Visit http://localhost:3000?site=admino`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => closeDb(db));
