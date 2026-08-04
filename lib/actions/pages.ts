"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageBlocks } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import type { AdminActionState } from "./types";

export async function getPages(siteId: number) {
  await requireRole("super_admin");
  return db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(asc(pages.sortOrder));
}

export async function getPage(id: number) {
  await requireRole("super_admin");
  try {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page ?? null;
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
  await requireRole("super_admin");

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
  await requireRole("super_admin");

  await db
    .update(pages)
    .set({ title, slug, description, template, published, updatedAt: new Date().toISOString() })
    .where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Page updated." };
}

export async function deletePage(id: number) {
  await requireRole("super_admin");
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}

export async function reorderPages(orderedIds: number[]) {
  await requireRole("super_admin");
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(pages).set({ sortOrder: i }).where(eq(pages.id, orderedIds[i]));
    }
  });
  revalidatePath("/admin/pages");
}

// ─── Page Blocks ──────────────────────────────────────────────────────────────

export async function getPageBlocks(pageId: number) {
  await requireRole("super_admin");
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
  await requireRole("super_admin");

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
  await requireRole("super_admin");

  await db
    .update(pageBlocks)
    .set({ title, visible, config, updatedAt: new Date().toISOString() })
    .where(eq(pageBlocks.id, id));

  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Block updated." };
}

export async function deletePageBlock(id: number) {
  await requireRole("super_admin");
  await db.delete(pageBlocks).where(eq(pageBlocks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}

export async function reorderPageBlocks(orderedIds: number[]) {
  await requireRole("super_admin");
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(pageBlocks).set({ sortOrder: i }).where(eq(pageBlocks.id, orderedIds[i]));
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}
