import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { pageBlocks, pages, settings } from "@/lib/db/schema-postgres";
import { DEFAULT_SETTINGS, type Feature } from "@/lib/settings";

function getFeatures(raw: string): Feature[] {
  try {
    const features = JSON.parse(raw);
    return Array.isArray(features) ? features : [];
  } catch {
    return [];
  }
}

/** Creates the editable homepage used by every newly provisioned tenant. */
export async function createDefaultHomepage(siteId: number) {
  const settingRows = await db.select().from(settings).where(eq(settings.siteId, siteId));
  const settingMap = new Map(settingRows.map((setting) => [setting.key, setting.value]));
  const value = (key: keyof typeof DEFAULT_SETTINGS) => settingMap.get(key) ?? DEFAULT_SETTINGS[key];
  const heroConfig = {
    title: value("heroTitle"),
    subtitle: value("heroSubtitle"),
    badge: value("heroBadge"),
    image: value("heroImage"),
    ctaPrimary: value("heroCtaPrimary"),
    ctaPrimaryLink: value("heroCtaPrimaryLink"),
    ctaSecondary: value("heroCtaSecondary"),
    ctaSecondaryLink: value("heroCtaSecondaryLink"),
  };
  const featuresConfig = {
    title: "Why Choose Us",
    items: getFeatures(value("features")),
  };
  const videoConfig = {
    url: value("videoUrl"),
    title: value("videoTitle"),
    description: value("videoDescription"),
    poster: value("videoPoster"),
  };

  const [existingPage] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.siteId, siteId), eq(pages.slug, "home")));
  const homepageId = existingPage?.id ?? (
    await db
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
      .returning({ id: pages.id })
  )[0].id;

  const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, homepageId));
  const defaults = [
    { type: "hero", sortOrder: 0, config: heroConfig },
    { type: "features", sortOrder: 1, config: featuresConfig },
    { type: "video", sortOrder: 2, config: videoConfig },
  ];

  for (const block of defaults) {
    const existingBlock = blocks.find((item) => item.type === block.type);
    if (!existingBlock) {
      if (block.type === "video") {
        const blocksToMove = blocks
          .filter((item) => item.sortOrder >= block.sortOrder)
          .sort((a, b) => b.sortOrder - a.sortOrder);
        for (const item of blocksToMove) {
          await db
            .update(pageBlocks)
            .set({ sortOrder: item.sortOrder + 1 })
            .where(eq(pageBlocks.id, item.id));
        }
      }
      await db.insert(pageBlocks).values({
        pageId: homepageId,
        type: block.type,
        sortOrder: block.sortOrder,
        visible: block.type !== "video" || value("showVideo") === "true",
        config: JSON.stringify(block.config),
      });
    } else if (
      block.type === "video" &&
      blocks.some((item) => item.id !== existingBlock.id && item.sortOrder === block.sortOrder)
    ) {
      const blocksToMove = blocks
        .filter((item) => item.id !== existingBlock.id && item.sortOrder >= block.sortOrder)
        .sort((a, b) => b.sortOrder - a.sortOrder);
      for (const item of blocksToMove) {
        await db
          .update(pageBlocks)
          .set({ sortOrder: item.sortOrder + 1 })
          .where(eq(pageBlocks.id, item.id));
      }
    } else if (!existingBlock.config) {
      await db
        .update(pageBlocks)
        .set({ config: JSON.stringify(block.config), updatedAt: new Date().toISOString() })
        .where(eq(pageBlocks.id, existingBlock.id));
    }
  }

  return homepageId;
}
