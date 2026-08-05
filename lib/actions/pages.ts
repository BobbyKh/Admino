"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageBlocks } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import type { AdminActionState } from "./types";

const LEGAL_TEMPLATE_CONTENT: Record<string, string> = {
  "privacy-policy": "<h1>Privacy Policy</h1><p><strong>Last updated:</strong> [Date]</p><p>This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.</p><h2>Information We Collect</h2><p>We may collect information you provide directly to us, including your name, email address, and any information you submit through our forms or services.</p><h2>How We Use Your Information</h2><p>We use your information to provide and improve our services, communicate with you, and meet our legal obligations.</p><h2>Sharing Your Information</h2><p>We do not sell your personal information. We may share it with trusted service providers when necessary to operate our services or when required by law.</p><h2>Your Choices</h2><p>You may contact us to request access to, correction of, or deletion of your personal information, subject to applicable law.</p><h2>Contact Us</h2><p>If you have questions about this Privacy Policy, please contact us at [Contact Email].</p>",
  terms: "<h1>Terms of Service</h1><p><strong>Last updated:</strong> [Date]</p><p>These Terms of Service govern your use of our website and services. By accessing or using them, you agree to these terms.</p><h2>Use of Our Services</h2><p>You agree to use our services lawfully and not to interfere with their operation, security, or availability.</p><h2>Accounts and Purchases</h2><p>You are responsible for providing accurate information and for maintaining the confidentiality of any account credentials. Purchases are subject to the terms presented at checkout.</p><h2>Intellectual Property</h2><p>Our content, branding, and services are protected by applicable intellectual property laws and may not be used without permission.</p><h2>Limitation of Liability</h2><p>To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of our services.</p><h2>Changes to These Terms</h2><p>We may update these terms from time to time. Continued use of our services after changes take effect constitutes acceptance of the updated terms.</p><h2>Contact Us</h2><p>If you have questions about these Terms of Service, please contact us at [Contact Email].</p>",
};

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
