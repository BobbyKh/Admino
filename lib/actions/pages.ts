"use server";

import { revalidatePath } from "next/cache";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageBlocks } from "@/lib/db/schema";
import { getCurrentAdminSiteId, requirePageAccess, requirePageBlockAccess, requireSiteAccess } from "@/lib/tenant-access";
import type { AdminActionState } from "./types";

export async function getPages(siteId: number) {
  await requireSiteAccess(siteId);
  return db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(asc(pages.sortOrder));
}

export async function getPage(id: number) {
  try {
    return await requirePageAccess(id);
  } catch {
    return null;
  }
}

export async function createPage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const siteId = Number(formData.get("siteId"));
  const title = String(formData.get("title") ?? "").trim();
  let slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = `page-${Date.now()}`;
  const description = String(formData.get("description") ?? "").trim() || null;
  const template = String(formData.get("template") ?? "default").trim();

  if (!siteId || !title) return { message: "Site ID and title are required." };
  await requireSiteAccess(siteId);

  const [existing] = await db
    .select()
    .from(pages)
    .where(eq(pages.siteId, siteId));
  if (existing && existing.slug === slug) {
    return { message: "A page with this slug already exists." };
  }

  const maxSort = await db
    .select({ sortOrder: pages.sortOrder })
    .from(pages)
    .where(eq(pages.siteId, siteId));

  const sortOrder = maxSort.length > 0 ? Math.max(...maxSort.map((r) => r.sortOrder)) + 1 : 0;

  await db
    .insert(pages)
    .values({
      siteId,
      title,
      slug,
      description,
      template,
      published: false,
      sortOrder,
    });

  revalidatePath("/admin/pages");
  return { success: true, message: `Page "${title}" created.` };
}

export async function updatePage(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const template = String(formData.get("template") ?? "default").trim();
  const published = formData.get("published") === "on";

  if (!id || !title) return { message: "Page ID and title are required." };
  await requirePageAccess(id);

  await db
    .update(pages)
    .set({ title, slug, description, template, published, updatedAt: new Date().toISOString() })
    .where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Page updated." };
}

export async function deletePage(id: number) {
  const page = await requirePageAccess(id);
  await db.delete(pages).where(and(eq(pages.id, id), eq(pages.siteId, page.siteId)));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}

export async function reorderPages(orderedIds: number[]) {
  const siteId = await getCurrentAdminSiteId();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(pages).set({ sortOrder: i }).where(and(eq(pages.id, orderedIds[i]), eq(pages.siteId, siteId)));
    }
  });
  revalidatePath("/admin/pages");
}

// ─── Page Blocks ──────────────────────────────────────────────────────────────

export async function getPageBlocks(pageId: number) {
  await requirePageAccess(pageId);
  return db.select().from(pageBlocks).where(eq(pageBlocks.pageId, pageId)).orderBy(asc(pageBlocks.sortOrder));
}

export async function addPageBlock(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { getDefaultConfig } = await import("@/lib/blocks");
  const pageId = Number(formData.get("pageId"));
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;

  if (!pageId || !type) return { message: "Page ID and block type are required." };
  await requirePageAccess(pageId);

  const maxSort = await db
    .select({ sortOrder: pageBlocks.sortOrder })
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId));
  const sortOrder = maxSort.length > 0 ? Math.max(...maxSort.map((r) => r.sortOrder)) + 1 : 0;

  const defaultConfig = getDefaultConfig(type);

  await db.insert(pageBlocks).values({
    pageId,
    type,
    title,
    sortOrder,
    visible: true,
    config: Object.keys(defaultConfig).length > 0 ? JSON.stringify(defaultConfig) : null,
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Block added." };
}

export async function updatePageBlock(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const config = String(formData.get("config") ?? "").trim() || null;

  if (!id) return { message: "Block ID is required." };
  await requirePageBlockAccess(id);

  await db
    .update(pageBlocks)
    .set({ title, visible, config, updatedAt: new Date().toISOString() })
    .where(eq(pageBlocks.id, id));

  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Block updated." };
}

export async function deletePageBlock(id: number) {
  await requirePageBlockAccess(id);
  await db.delete(pageBlocks).where(eq(pageBlocks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}

export async function reorderPageBlocks(orderedIds: number[]) {
  const siteId = await getCurrentAdminSiteId();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const [block] = await tx.select({ pageId: pageBlocks.pageId }).from(pageBlocks).where(eq(pageBlocks.id, orderedIds[i]));
      if (!block) continue;
      const [page] = await tx.select({ siteId: pages.siteId }).from(pages).where(eq(pages.id, block.pageId));
      if (page?.siteId === siteId) {
        await tx.update(pageBlocks).set({ sortOrder: i }).where(eq(pageBlocks.id, orderedIds[i]));
      }
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}
