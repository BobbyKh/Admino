/**
 * Seeds the platform-owned Admino tenant with an editable web-builder showcase.
 * It only refreshes pages and navigation belonging to the `default` site.
 */
import { and, eq } from "drizzle-orm";
import { db, closeDb } from "../lib/db/client";
import { hashPassword } from "../lib/password";
import { DEFAULT_SETTINGS, type SettingKey } from "../lib/settings";
import {
  adminUsers,
  navLinks,
  pageBlocks,
  pages,
  settings,
  sites,
} from "../lib/db/schema";

const ADMINO_SETTINGS: Record<SettingKey, string> = {
  ...DEFAULT_SETTINGS,
  siteName: "Admino",
  tagline: "Launch better websites, faster",
  description: "Admino is a multi-tenant website builder for teams that need polished, editable websites without rebuilding from scratch.",
  logo: "",
  address: "Built for ambitious teams everywhere",
  phone: "",
  email: "hello@admino.com",
  mapQuery: "",
  videoTitle: "See what we can build together",
  aboutTitle: "Website operations, simplified",
  aboutText: "Admino gives platform teams a structured way to launch and operate tenant websites. Build pages from reusable blocks, give each tenant its own workspace, and keep every update under control.",
  aboutImage: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85",
  services: JSON.stringify([
    "Visual page building",
    "Tenant workspaces",
    "Custom navigation",
    "Media management",
    "Role-based access",
    "Custom domains",
  ]),
  hours: "Monday to Friday, 9 AM to 5 PM",
  priceRange: "Plans for every stage",
  rating: "",
  reviewCount: "",
  footerNote: "Admino gives teams a faster way to publish and manage websites.",
  navbarCtaLabel: "Start Building",
  navbarCtaLink: "/contact",
  navbarShowPhone: "false",
  footerExploreTitle: "Product",
  footerContactTitle: "Talk to us",
  footerHoursTitle: "Availability",
  footerCopyright: "© Admino. Built for modern website teams.",
};

type SeedBlock = { type: string; config: Record<string, unknown> };
type SeedPage = {
  title: string;
  slug: string;
  description: string;
  blocks: SeedBlock[];
};

const SITE_PAGES: SeedPage[] = [
  {
    title: "Home",
    slug: "home",
    description: "Admino website builder",
    blocks: [
      {
        type: "hero",
        config: {
          badge: "Multi-tenant website builder",
          title: "Launch websites your clients can actually manage.",
          subtitle: "Admino gives teams a polished builder, tenant-safe admin tools, reusable blocks, and a faster route from idea to live site.",
          image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=85",
          ctaPrimary: "Build your site",
          ctaPrimaryLink: "/contact",
          ctaSecondary: "Explore pricing",
          ctaSecondaryLink: "/pricing",
        },
      },
      {
        type: "features",
        config: {
          title: "Everything your website needs to grow",
          subtitle: "One workspace for publishing, editing, and operating every tenant site.",
          items: [
            { icon: "layers", title: "Visual page builder", text: "Compose pages from reusable blocks without touching code." },
            { icon: "globe", title: "Tenant-ready", text: "Each website has its own content, media, navigation, and team." },
            { icon: "shield", title: "Built for control", text: "Roles and tenant isolation keep every workspace protected." },
            { icon: "zap", title: "Publish faster", text: "Start with a prebuilt homepage, then make it your own." },
          ],
        },
      },
      {
        type: "imageText",
        config: {
          layout: "right",
          badge: "Designed for operators",
          title: "Give every tenant a website they can run themselves.",
          text: "From header links and media to pages and homepage blocks, Admino keeps routine updates simple while your platform keeps the structure consistent.",
          image: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=85",
          buttonText: "See how it works",
          buttonLink: "/about",
        },
      },
      {
        type: "stats",
        config: {
          title: "A better foundation for every new site",
          items: [
            { value: "1", label: "Shared web platform" },
            { value: "∞", label: "Tenant websites" },
            { value: "30+", label: "Composable blocks" },
            { value: "100%", label: "Tenant-scoped content" },
          ],
        },
      },
      {
        type: "pricing",
        config: {
          badge: "Simple, flexible plans",
          title: "A plan for every website operation",
          subtitle: "Start small, then add tenants, domains, and team workflows as you grow.",
          items: [
            { name: "Starter", price: "$29", period: "month", description: "For one focused website", features: ["One tenant site", "Page builder", "Media library"], buttonText: "Get started", buttonLink: "/contact" },
            { name: "Growth", price: "$99", period: "month", description: "For growing multi-site teams", highlighted: true, features: ["Up to 10 tenant sites", "Custom domains", "Team roles", "Priority support"], buttonText: "Choose Growth", buttonLink: "/contact" },
            { name: "Platform", price: "Custom", period: "", description: "For serious website operations", features: ["Unlimited tenants", "Platform controls", "Custom integrations"], buttonText: "Talk to us", buttonLink: "/contact" },
          ],
        },
      },
      {
        type: "ctaBanner",
        config: {
          title: "Ready to build a better website workflow?",
          subtitle: "Create a tenant site, customize the homepage, and publish with confidence.",
          buttonText: "Talk to Admino",
          buttonLink: "/contact",
        },
      },
    ],
  },
  {
    title: "Pricing",
    slug: "pricing",
    description: "Flexible plans for every website team",
    blocks: [
      {
        type: "pricing",
        config: {
          title: "Plans that scale with your tenants",
          subtitle: "Start with a focused website, then grow into a full multi-site operation.",
          items: [
            { name: "Starter", price: "$29", period: "month", features: ["One tenant site", "Page builder", "Media library", "Email support"] },
            { name: "Growth", price: "$99", period: "month", highlighted: true, features: ["Up to 10 tenant sites", "Custom domains", "Team roles", "Priority support"] },
            { name: "Platform", price: "Custom", period: "", features: ["Unlimited tenants", "Platform controls", "Onboarding support", "Custom integrations"] },
          ],
        },
      },
      {
        type: "faq",
        config: {
          title: "Pricing questions",
          items: [
            { question: "Can every tenant edit their own website?", answer: "Yes. Tenant users access only their assigned site and its content." },
            { question: "Can I use my own domain?", answer: "Yes. Admino supports tenant subdomains and custom domains." },
            { question: "Can I change plans later?", answer: "Yes. Plans are designed to grow with your website operation." },
          ],
        },
      },
    ],
  },
  {
    title: "About Admino",
    slug: "about",
    description: "The operating system for multi-tenant websites",
    blocks: [
      {
        type: "imageText",
        config: {
          layout: "left",
          badge: "About Admino",
          title: "Website operations should not require a development queue.",
          text: "Admino is built for teams that create and operate websites for many businesses. It combines a structured block builder with tenant-aware content, media, navigation, and permissions.",
          image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85",
        },
      },
      {
        type: "services",
        config: {
          title: "What Admino gives your team",
          items: [
            { title: "Reusable building blocks", description: "Create consistent pages without repeating implementation work." },
            { title: "Tenant isolation", description: "Keep content, media, navigation, and users scoped to the right site." },
            { title: "Operational visibility", description: "Manage sites, pages, users, and activity from one platform." },
          ],
        },
      },
    ],
  },
  {
    title: "Contact",
    slug: "contact",
    description: "Talk to the Admino team",
    blocks: [
      {
        type: "contactForm",
        config: {
          title: "Let’s build your website platform",
          subtitle: "Tell us about your tenants, workflows, and goals.",
          email: "hello@admino.com",
          showPhone: "false",
          showSubject: "true",
          buttonText: "Send inquiry",
          successMessage: "Thanks. The Admino team will be in touch shortly.",
        },
      },
    ],
  },
];

async function seedPage(siteId: number, page: SeedPage) {
  const [existingPage] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.siteId, siteId), eq(pages.slug, page.slug)));

  const pageId = existingPage?.id ?? (
    await db
      .insert(pages)
      .values({ siteId, title: page.title, slug: page.slug, description: page.description, published: true, sortOrder: SITE_PAGES.indexOf(page) })
      .returning({ id: pages.id })
  )[0].id;

  await db
    .update(pages)
    .set({ title: page.title, description: page.description, published: true, sortOrder: SITE_PAGES.indexOf(page), updatedAt: new Date().toISOString() })
    .where(eq(pages.id, pageId));
  await db.delete(pageBlocks).where(eq(pageBlocks.pageId, pageId));
  await db.insert(pageBlocks).values(
    page.blocks.map((block, sortOrder) => ({
      pageId,
      type: block.type,
      sortOrder,
      visible: true,
      config: JSON.stringify(block.config),
    }))
  );
}

async function main() {
  console.log("Seeding the Admino default tenant...");

  const [existingSite] = await db.select().from(sites).where(eq(sites.slug, "default"));
  const siteId = existingSite?.id ?? (
    await db
      .insert(sites)
      .values({ name: "Admino", slug: "default", template: "business", published: true, description: "Multi-tenant website builder" })
      .returning({ id: sites.id })
  )[0].id;

  await db
    .update(sites)
    .set({ name: "Admino", template: "business", description: "Multi-tenant website builder", published: true, updatedAt: new Date().toISOString() })
    .where(eq(sites.id, siteId));

  for (const [key, value] of Object.entries(ADMINO_SETTINGS)) {
    await db
      .insert(settings)
      .values({ key, siteId, value, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: [settings.key, settings.siteId],
        set: { value, updatedAt: new Date().toISOString() },
      });
  }

  const email = (process.env.ADMIN_EMAIL ?? "admin@admino.local").toLowerCase();
  const [existingAdmin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
  if (!existingAdmin) {
    await db.insert(adminUsers).values({
      name: "Admino Super Admin",
      email,
      passwordHash: await hashPassword(process.env.ADMIN_PASSWORD ?? "admino2026"),
      role: "super_admin",
    });
  }

  for (const page of SITE_PAGES) {
    await seedPage(siteId, page);
  }

  await db.delete(navLinks).where(eq(navLinks.siteId, siteId));
  await db.insert(navLinks).values([
    { siteId, label: "Home", href: "/", sortOrder: 0, visible: true, external: false },
    { siteId, label: "Pricing", href: "/pricing", sortOrder: 1, visible: true, external: false },
    { siteId, label: "About", href: "/about", sortOrder: 2, visible: true, external: false },
    { siteId, label: "Contact", href: "/contact", sortOrder: 3, visible: true, external: false },
  ]);

  console.log(`Admino seed complete for default site ${siteId}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb(db));
