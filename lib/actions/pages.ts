"use server";

import { revalidatePath } from "next/cache";
import { and, eq, asc, desc, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageBlocks, pageRevisions } from "@/lib/db/schema";
import { hasMinRole, type Role } from "@/lib/auth";
import { requirePageAccess, requirePageBlockAccess, requireSiteAccess } from "@/lib/tenant-access";
import { requireTenantFeature } from "@/lib/tenant-features";
import { validateBlockConfig, validateBlockType } from "@/lib/block-config-validation";
import type { AdminActionState } from "./types";

const LEGAL_TEMPLATE_CONTENT: Record<string, string> = {
  "privacy-policy": "<h1>Privacy Policy</h1><p><strong>Last updated:</strong> [Date]</p><p>This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.</p><h2>Information We Collect</h2><p>We may collect information you provide directly to us, including your name, email address, and any information you submit through our forms or services.</p><h2>How We Use Your Information</h2><p>We use your information to provide and improve our services, communicate with you, and meet our legal obligations.</p><h2>Sharing Your Information</h2><p>We do not sell your personal information. We may share it with trusted service providers when necessary to operate our services or when required by law.</p><h2>Your Choices</h2><p>You may contact us to request access to, correction of, or deletion of your personal information, subject to applicable law.</p><h2>Contact Us</h2><p>If you have questions about this Privacy Policy, please contact us at [Contact Email].</p>",
  terms: "<h1>Terms of Service</h1><p><strong>Last updated:</strong> [Date]</p><p>These Terms of Service govern your use of our website and services. By accessing or using them, you agree to these terms.</p><h2>Use of Our Services</h2><p>You agree to use our services lawfully and not to interfere with their operation, security, or availability.</p><h2>Accounts and Purchases</h2><p>You are responsible for providing accurate information and for maintaining the confidentiality of any account credentials. Purchases are subject to the terms presented at checkout.</p><h2>Intellectual Property</h2><p>Our content, branding, and services are protected by applicable intellectual property laws and may not be used without permission.</p><h2>Limitation of Liability</h2><p>To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of our services.</p><h2>Changes to These Terms</h2><p>We may update these terms from time to time. Continued use of our services after changes take effect constitutes acceptance of the updated terms.</p><h2>Contact Us</h2><p>If you have questions about these Terms of Service, please contact us at [Contact Email].</p>",
};

export async function getPages(siteId: number) {
  const user = await requireSiteAccess(siteId);
  await requirePagesFeature(user, siteId);
  return db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(asc(pages.sortOrder));
}

export async function getPage(id: number) {
  try {
    const page = await requirePageAccess(id);
    const user = await requireSiteAccess(page.siteId);
    await requirePagesFeature(user, page.siteId);
    return page;
  } catch {
    return null;
  }
}

function canWritePage(role: string) {
  return hasMinRole((role as Role) ?? "viewer", "editor");
}

async function requirePagesFeature(user: { id: number; role: string }, siteId: number) {
  await requireTenantFeature(siteId, "pages", { role: (user.role as Role) ?? "viewer", userId: user.id });
}

async function createPageRevision(pageId: number, label: string, userId: number) {
  const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, pageId)).orderBy(asc(pageBlocks.sortOrder));
  await db.insert(pageRevisions).values({
    pageId,
    userId,
    label,
    snapshot: JSON.stringify({ blocks }),
  });
}

export async function getPageRevisions(pageId: number) {
  const page = await requirePageAccess(pageId);
  const user = await requireSiteAccess(page.siteId);
  await requirePagesFeature(user, page.siteId);
  return db
    .select({ id: pageRevisions.id, label: pageRevisions.label, createdAt: pageRevisions.createdAt })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.createdAt))
    .limit(20);
}

export async function restorePageRevision(revisionId: number) {
  const [revision] = await db.select().from(pageRevisions).where(eq(pageRevisions.id, revisionId));
  if (!revision) throw new Error("Revision not found.");
  const page = await requirePageAccess(revision.pageId);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) throw new Error("Forbidden");
  await requirePagesFeature(user, page.siteId);

  let snapshot: { blocks?: Array<{ type: string; title: string | null; sortOrder: number; visible: boolean; config: string | null }> };
  try {
    snapshot = JSON.parse(revision.snapshot) as typeof snapshot;
  } catch {
    throw new Error("Revision snapshot is invalid.");
  }

  await createPageRevision(page.id, "Before revision restore", user.id);
  await db.transaction(async (tx) => {
    await tx.delete(pageBlocks).where(eq(pageBlocks.pageId, page.id));
    for (const block of snapshot.blocks ?? []) {
      await tx.insert(pageBlocks).values({
        pageId: page.id,
        type: block.type,
        title: block.title,
        sortOrder: block.sortOrder,
        visible: block.visible,
        config: block.config,
        updatedAt: new Date().toISOString(),
      });
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
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
const user = await requireSiteAccess(siteId);
  if (!canWritePage(user.role)) return { message: "You don't have permission to create pages." };
  await requirePagesFeature(user, siteId);

  const [existing] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.siteId, siteId), eq(pages.slug, slug)));
  if (existing) {
    return { message: "A page with this slug already exists." };
  }

  const maxSort = await db
    .select({ sortOrder: pages.sortOrder })
    .from(pages)
    .where(eq(pages.siteId, siteId));

  const sortOrder = maxSort.length > 0 ? Math.max(...maxSort.map((r) => r.sortOrder)) + 1 : 0;

  const [page] = await db
    .insert(pages)
    .values({
      siteId,
      title,
      slug,
      description,
      template,
      published: false,
      sortOrder,
    })
    .returning({ id: pages.id });

  const legalContent = LEGAL_TEMPLATE_CONTENT[template];
  if (legalContent) {
    await db.insert(pageBlocks).values({
      pageId: page.id,
      type: "richText",
      sortOrder: 0,
      visible: true,
      config: JSON.stringify({ html: legalContent }),
    });
  }

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
  const page = await requirePageAccess(id);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) return { message: "You don't have permission to update pages." };
  await requirePagesFeature(user, page.siteId);

  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!normalizedSlug) return { message: "Slug is required." };
  const [existing] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.siteId, page.siteId), eq(pages.slug, normalizedSlug), ne(pages.id, id)));
  if (existing) return { message: "A page with this slug already exists." };

  await db
    .update(pages)
    .set({ title, slug: normalizedSlug, description, template, published, updatedAt: new Date().toISOString() })
    .where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Page updated." };
}

export async function deletePage(id: number) {
  const page = await requirePageAccess(id);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) throw new Error("Forbidden");
  await requirePagesFeature(user, page.siteId);
  await db.delete(pages).where(eq(pages.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}

export async function reorderPages(orderedIds: number[]) {
  if (orderedIds.length === 0) return;
  const rows = await db.select({ id: pages.id, siteId: pages.siteId }).from(pages).where(inArray(pages.id, orderedIds));
  const siteId = rows[0]?.siteId;
  if (!siteId || rows.length !== orderedIds.length || rows.some((row) => row.siteId !== siteId)) throw new Error("Invalid page order.");
const user = await requireSiteAccess(siteId);
  if (!canWritePage(user.role)) throw new Error("Forbidden");
  await requirePagesFeature(user, siteId);
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(pages).set({ sortOrder: i }).where(eq(pages.id, orderedIds[i]));
    }
  });
  revalidatePath("/admin/pages");
}

// ─── Page Blocks ──────────────────────────────────────────────────────────────

export async function getPageBlocks(pageId: number) {
  const page = await requirePageAccess(pageId);
  const user = await requireSiteAccess(page.siteId);
  await requirePagesFeature(user, page.siteId);
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
  try {
    validateBlockType(type);
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Invalid block type." };
  }
const page = await requirePageAccess(pageId);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) return { message: "You don't have permission to update page blocks." };
  await requirePagesFeature(user, page.siteId);

  const maxSort = await db
    .select({ sortOrder: pageBlocks.sortOrder })
    .from(pageBlocks)
    .where(eq(pageBlocks.pageId, pageId));
  const sortOrder = maxSort.length > 0 ? Math.max(...maxSort.map((r) => r.sortOrder)) + 1 : 0;

  const defaultConfig = getDefaultConfig(type);

  await createPageRevision(page.id, "Before adding block", user.id);
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

  if (!id) return { message: "Block ID is required." };
  const block = await requirePageBlockAccess(id);
  const page = await requirePageAccess(block.pageId);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) return { message: "You don't have permission to update page blocks." };
  await requirePagesFeature(user, page.siteId);

  // Callers update one block property at a time. Preserve every omitted field
  // rather than treating it as an empty value.
  const updates: { title?: string | null; visible?: boolean; config?: string | null; updatedAt: string } = {
    updatedAt: new Date().toISOString(),
  };
  if (formData.has("title")) {
    updates.title = String(formData.get("title") ?? "").trim() || null;
  }
  if (formData.has("visible")) {
    updates.visible = formData.get("visible") === "on";
  }
  if (formData.has("config")) {
    try {
      updates.config = validateBlockConfig(block.type, String(formData.get("config") ?? "").trim() || null);
    } catch (error) {
      return { message: error instanceof Error ? error.message : "Invalid block config." };
    }
  }

  await createPageRevision(page.id, "Before updating block", user.id);
  await db
    .update(pageBlocks)
    .set(updates)
    .where(eq(pageBlocks.id, id));

  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
  return { success: true, message: "Block updated." };
}

export async function deletePageBlock(id: number) {
  const block = await requirePageBlockAccess(id);
  const page = await requirePageAccess(block.pageId);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) throw new Error("Forbidden");
  await requirePagesFeature(user, page.siteId);
  await createPageRevision(page.id, "Before deleting block", user.id);
  await db.delete(pageBlocks).where(eq(pageBlocks.id, id));
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}

export async function reorderPageBlocks(orderedIds: number[]) {
  if (orderedIds.length === 0) return;
  const rows = await db.select({ id: pageBlocks.id, pageId: pageBlocks.pageId }).from(pageBlocks).where(inArray(pageBlocks.id, orderedIds));
  const pageId = rows[0]?.pageId;
  if (!pageId || rows.length !== orderedIds.length || rows.some((row) => row.pageId !== pageId)) throw new Error("Invalid block order.");
const page = await requirePageAccess(pageId);
  const user = await requireSiteAccess(page.siteId);
  if (!canWritePage(user.role)) throw new Error("Forbidden");
  await requirePagesFeature(user, page.siteId);
  await createPageRevision(page.id, "Before reordering blocks", user.id);
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(pageBlocks).set({ sortOrder: i }).where(eq(pageBlocks.id, orderedIds[i]));
    }
  });
  revalidatePath("/", "layout");
  revalidatePath("/admin/pages");
}
