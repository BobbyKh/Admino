import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { navLinks, pageBlocks, pages, settings } from "@/lib/db/schema-postgres";
import { createDefaultHomepage } from "@/lib/default-homepage";
import { createDefaultNavigation } from "@/lib/default-navigation";

export async function createEcommerceTemplate(
  siteId: number,
  siteName: string,
  replaceExistingBlocks = false
) {
  const values: Record<string, string> = {
    siteName,
    tagline: "Thoughtfully selected goods for everyday life.",
    description: `${siteName} is an online store for thoughtfully selected everyday goods.`,
    heroTitle: "Made for the everyday.",
    heroSubtitle: "Discover considered essentials, designed to be used and loved.",
    heroImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80",
    heroBadge: "New collection available now",
    heroCtaPrimary: "Shop the collection",
    heroCtaPrimaryLink: "/#shop",
    heroCtaSecondary: "Get in touch",
    heroCtaSecondaryLink: "/contact",
    features: JSON.stringify([
      { title: "Thoughtful quality", text: "Well-made essentials chosen for daily use.", icon: "heart" },
      { title: "Simple delivery", text: "Clear shipping updates from checkout to doorstep.", icon: "cart" },
      { title: "Easy returns", text: "Shop with confidence with straightforward returns.", icon: "shield" },
      { title: "Customer support", text: "Helpful answers when you need them.", icon: "users" },
    ]),
    address: "Online store",
    phone: "",
    email: "hello@example.com",
    hours: "Shop online anytime",
    priceRange: "",
    rating: "",
    reviewCount: "",
    footerNote: "Quality goods, thoughtfully selected.",
    navbarCtaLabel: "Contact",
    navbarCtaLink: "/contact",
    navbarShowPhone: "false",
    footerExploreTitle: "Shop",
    footerContactTitle: "Contact",
    footerHoursTitle: "Online store",
  };

  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(settings)
      .values({ key, value, siteId, updatedAt: now })
      .onConflictDoUpdate({
        target: [settings.key, settings.siteId],
        set: { value, updatedAt: now },
      });
  }

  if (replaceExistingBlocks) {
    const [homepage] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.siteId, siteId), eq(pages.slug, "home")));
    if (homepage) await db.delete(pageBlocks).where(eq(pageBlocks.pageId, homepage.id));
    await db.delete(navLinks).where(eq(navLinks.siteId, siteId));
  }

  const homepageId = await createDefaultHomepage(siteId);
  await createDefaultNavigation(siteId, "ecommerce");

  const [productGrid] = await db
    .select({ id: pageBlocks.id })
    .from(pageBlocks)
    .where(and(eq(pageBlocks.pageId, homepageId), eq(pageBlocks.type, "productGrid")));
  if (productGrid) return;

  await db.insert(pageBlocks).values({
    pageId: homepageId,
    type: "productGrid",
    sortOrder: 3,
    visible: true,
    config: JSON.stringify({
      title: "Featured collection",
      subtitle: "A few current favorites from our store.",
      badge: "Just in",
      source: "featured",
      showFilters: "false",
      columns: "4",
      items: [
        { name: "Canvas carryall", price: "$48", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80", description: "A durable everyday bag.", badge: "New" },
        { name: "Everyday bottle", price: "$32", image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80", description: "Insulated and ready for the day." },
        { name: "Soft knit throw", price: "$76", image: "https://images.unsplash.com/photo-1583845112203-29329902332e?auto=format&fit=crop&w=900&q=80", description: "A warm finishing touch." },
        { name: "Desk light", price: "$64", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80", description: "A focused light for any space." },
      ],
    }),
  });
}
