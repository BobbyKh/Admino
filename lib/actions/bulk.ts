"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { blogPosts, bookings, conversionFunnels, emailCampaigns, errorLogs, experiments, galleryImages, homeSections, menuItems, messages, navLinks, pages, products, promotions, sellerOrganizations, sellerStores, services, webhooks } from "@/lib/db/schema";
import { requireSiteFeatureForRole } from "@/lib/tenant-access";
import { requireSiteAccess } from "@/lib/tenant-access";
import { fulfillOrder } from "@/lib/actions/commerce";
import type { BulkActionResult, BulkItemResult } from "@/lib/actions/types";
import { logActivity } from "@/lib/activity";

const requestSchema = z.object({
  siteId: z.number().int().positive(),
  entity: z.enum(["products", "blog", "promotions", "messages", "bookings", "navigation", "homepage", "menu", "services", "webhooks", "campaigns", "orders", "pages", "gallery", "errors", "experiments", "funnels", "sellers"]),
  action: z.string().min(1).max(40),
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export async function runBulkAction(input: z.input<typeof requestSchema>): Promise<BulkActionResult> {
  const parsed = requestSchema.parse({ ...input, ids: [...new Set(input.ids)] });
  const { siteId, entity, action, ids } = parsed;
  if (entity === "orders") {
    await requireSiteFeatureForRole(siteId, "commerce", "admin");
    if (action !== "fulfill" || ids.length > 25) throw new Error("Unsupported bulk order action.");
    const results: BulkItemResult[] = [];
    for (const id of ids) { try { await fulfillOrder(id); results.push({ id, success: true }); } catch (error) { results.push({ id, success: false, message: error instanceof Error ? error.message : "Failed" }); } }
    const summary = summarize(results);
    await logBulk(siteId, entity, action, ids, summary);
    return summary;
  }
  await authorize(siteId, entity);
  const results = await mutate(siteId, entity, action, ids);
  revalidate(entity);
  const summary = summarize(results);
  await logBulk(siteId, entity, action, ids, summary);
  return summary;
}

async function authorize(siteId: number, entity: string) {
  const feature = entity === "blog" ? "blog" : entity === "messages" ? "messages" : entity === "bookings" ? "bookings" : entity === "navigation" ? "navigation" : entity === "menu" ? "menu" : entity === "services" ? "services" : entity === "pages" ? "pages" : entity === "gallery" ? "gallery" : entity === "sellers" ? "marketplace" : ["products", "promotions", "campaigns"].includes(entity) ? "commerce" : null;
  if (feature) await requireSiteFeatureForRole(siteId, feature as "blog" | "messages" | "bookings" | "navigation" | "menu" | "services" | "pages" | "gallery" | "commerce" | "marketplace", "admin");
  else await requireSiteAccess(siteId);
}

async function mutate(siteId: number, entity: string, action: string, ids: number[]): Promise<BulkItemResult[]> {
  if (entity === "products" && ["active", "draft", "archived"].includes(action)) return updateRows(products, siteId, ids, { status: action, updatedAt: new Date().toISOString() });
  if (entity === "products" && ["feature", "unfeature"].includes(action)) return updateRows(products, siteId, ids, { featured: action === "feature", updatedAt: new Date().toISOString() });
  if (entity === "blog" && ["publish", "unpublish"].includes(action)) return updateRows(blogPosts, siteId, ids, { published: action === "publish", publishedAt: action === "publish" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() });
  if (entity === "promotions" && ["active", "archived", "draft"].includes(action)) return updateRows(promotions, siteId, ids, { status: action, updatedAt: new Date().toISOString() });
  if (entity === "messages" && ["read", "unread"].includes(action)) return updateRows(messages, siteId, ids, { read: action === "read" });
  if (entity === "messages" && action === "delete") return deleteRows(messages, siteId, ids);
  if (entity === "navigation" && ["show", "hide"].includes(action)) return updateRows(navLinks, siteId, ids, { visible: action === "show" });
  if (entity === "navigation" && action === "delete") return deleteRows(navLinks, siteId, ids);
  if (entity === "homepage" && ["show", "hide"].includes(action)) return updateRows(homeSections, siteId, ids, { visible: action === "show" });
  if (entity === "homepage" && action === "delete") return deleteRows(homeSections, siteId, ids);
  if (entity === "menu" && ["available", "unavailable"].includes(action)) return updateRows(menuItems, siteId, ids, { available: action === "available" });
  if (entity === "menu" && ["feature", "unfeature"].includes(action)) return updateRows(menuItems, siteId, ids, { featured: action === "feature" });
  if (entity === "menu" && action === "delete") return deleteRows(menuItems, siteId, ids);
  if (entity === "services" && ["active", "inactive"].includes(action)) return updateRows(services, siteId, ids, { active: action === "active", updatedAt: new Date().toISOString() });
  if (entity === "services" && ["feature", "unfeature"].includes(action)) return updateRows(services, siteId, ids, { featured: action === "feature", updatedAt: new Date().toISOString() });
  if (entity === "webhooks" && ["enable", "disable"].includes(action)) return updateRows(webhooks, siteId, ids, { active: action === "enable", updatedAt: new Date().toISOString() });
  if (entity === "campaigns" && action === "delete_drafts") return deleteRows(emailCampaigns, siteId, ids, eq(emailCampaigns.status, "draft"));
  if (entity === "pages" && ["publish", "unpublish"].includes(action)) return updateRows(pages, siteId, ids, { published: action === "publish", updatedAt: new Date().toISOString() });
  if (entity === "pages" && ["index", "noindex"].includes(action)) return updateRows(pages, siteId, ids, { noindex: action === "noindex", updatedAt: new Date().toISOString() });
  if (entity === "gallery" && ["feature", "unfeature"].includes(action)) return updateRows(galleryImages, siteId, ids, { featured: action === "feature" });
  if (entity === "gallery" && action === "delete") return deleteRows(galleryImages, siteId, ids);
  if (entity === "errors" && ["resolve", "reopen"].includes(action)) return updateRows(errorLogs, siteId, ids, { resolved: action === "resolve" ? 1 : 0 });
  if (entity === "errors" && action === "delete") return deleteRows(errorLogs, siteId, ids);
  if (entity === "experiments") return transitionExperiments(siteId, ids, action);
  if (entity === "funnels" && action === "delete") return deleteRows(conversionFunnels, siteId, ids);
  if (entity === "sellers" && ["activate", "suspend"].includes(action)) return updateSellerStatuses(siteId, ids, action);
  if (entity === "bookings") return transitionBookings(siteId, ids, action);
  throw new Error("Unsupported bulk action.");
}

async function updateRows(table: typeof products | typeof blogPosts | typeof promotions | typeof messages | typeof navLinks | typeof homeSections | typeof menuItems | typeof services | typeof webhooks | typeof pages | typeof galleryImages | typeof errorLogs, siteId: number, ids: number[], values: Record<string, unknown>) {
  const updated = await db.update(table).set(values).where(and(eq(table.siteId, siteId), inArray(table.id, ids))).returning({ id: table.id });
  return itemResults(ids, updated.map((row) => row.id));
}

async function deleteRows(table: typeof messages | typeof navLinks | typeof homeSections | typeof menuItems | typeof emailCampaigns | typeof galleryImages | typeof errorLogs | typeof conversionFunnels, siteId: number, ids: number[], extra?: ReturnType<typeof eq>) {
  const deleted = await db.delete(table).where(and(eq(table.siteId, siteId), inArray(table.id, ids), extra)).returning({ id: table.id });
  return itemResults(ids, deleted.map((row) => row.id));
}

async function transitionExperiments(siteId: number, ids: number[], action: string) {
  const allowedFrom: Record<string, string[]> = { pause: ["running"], resume: ["paused"], complete: ["running", "paused"], delete_drafts: ["draft"] };
  if (!allowedFrom[action]) throw new Error("Unsupported experiment transition.");
  const rows = await db.select({ id: experiments.id, status: experiments.status }).from(experiments).where(and(eq(experiments.siteId, siteId), inArray(experiments.id, ids)));
  const results: BulkItemResult[] = [];
  for (const id of ids) {
    const row = rows.find((item) => item.id === id);
    if (!row || !allowedFrom[action].includes(row.status)) { results.push({ id, success: false, message: row ? `Cannot apply action to ${row.status}.` : "Not found." }); continue; }
    const changed = action === "delete_drafts"
      ? await db.delete(experiments).where(and(eq(experiments.id, id), eq(experiments.siteId, siteId), eq(experiments.status, "draft"))).returning({ id: experiments.id })
      : await db.update(experiments).set({ status: action === "pause" ? "paused" : action === "resume" ? "running" : "completed", updatedAt: new Date().toISOString() }).where(and(eq(experiments.id, id), eq(experiments.siteId, siteId), eq(experiments.status, row.status))).returning({ id: experiments.id });
    results.push({ id, success: changed.length === 1, message: changed.length ? undefined : "Changed by another user." });
  }
  return results;
}

async function transitionBookings(siteId: number, ids: number[], action: string) {
  const allowedFrom: Record<string, string[]> = { confirmed: ["pending"], completed: ["confirmed"], cancelled: ["pending", "confirmed"] };
  if (!allowedFrom[action]) throw new Error("Unsupported booking transition.");
  const rows = await db.select({ id: bookings.id, status: bookings.status }).from(bookings).where(and(eq(bookings.siteId, siteId), inArray(bookings.id, ids)));
  const results: BulkItemResult[] = [];
  for (const id of ids) {
    const row = rows.find((item) => item.id === id);
    if (!row) { results.push({ id, success: false, message: "Not found." }); continue; }
    if (!allowedFrom[action].includes(row.status)) { results.push({ id, success: false, message: `Cannot change ${row.status} to ${action}.` }); continue; }
    const updated = await db.update(bookings).set({ status: action }).where(and(eq(bookings.id, id), eq(bookings.siteId, siteId), eq(bookings.status, row.status))).returning({ id: bookings.id });
    results.push({ id, success: updated.length === 1, message: updated.length ? undefined : "Changed by another user." });
  }
  return results;
}

async function updateSellerStatuses(siteId: number, ids: number[], action: string) {
  const status = action === "activate" ? "active" : "suspended";
  const now = new Date().toISOString();
  const updatedIds = await db.transaction(async (tx) => {
    const updated = await tx.update(sellerOrganizations).set({ status, updatedAt: now }).where(and(eq(sellerOrganizations.siteId, siteId), inArray(sellerOrganizations.id, ids))).returning({ id: sellerOrganizations.id });
    const sellerIds = updated.map((row) => row.id);
    if (sellerIds.length) await tx.update(sellerStores).set({ status, updatedAt: now }).where(and(eq(sellerStores.siteId, siteId), inArray(sellerStores.sellerId, sellerIds)));
    return sellerIds;
  });
  return itemResults(ids, updatedIds);
}

function itemResults(ids: number[], succeeded: number[]) { const set = new Set(succeeded); return ids.map((id) => ({ id, success: set.has(id), message: set.has(id) ? undefined : "Not found or not eligible." })); }
function summarize(results: BulkItemResult[]): BulkActionResult { const succeeded = results.filter((item) => item.success).length; return { total: results.length, succeeded, failed: results.length - succeeded, results }; }
async function logBulk(siteId: number, entity: string, action: string, ids: number[], result: BulkActionResult) { await logActivity({ siteId, action: "update", entity: "bulk_operation", entityName: `${entity}:${action}`, details: { ids, total: result.total, succeeded: result.succeeded, failed: result.failed } }); }
function revalidate(entity: string) { const paths: Record<string, string[]> = { products: ["/admin/commerce/products", "/"], blog: ["/admin/blog", "/blog"], promotions: ["/admin/commerce/promotions"], messages: ["/admin/messages"], bookings: ["/admin/bookings"], navigation: ["/admin/navigation", "/"], homepage: ["/admin/homepage", "/"], menu: ["/admin/menu", "/menu"], services: ["/admin/services"], webhooks: ["/admin/webhooks"], campaigns: ["/admin/commerce/marketing"], pages: ["/admin/pages", "/"], gallery: ["/admin/gallery", "/gallery"], errors: ["/admin/errors"], experiments: ["/admin/experiments"], funnels: ["/admin/funnels"], sellers: ["/admin/commerce/sellers"] }; for (const path of paths[entity] ?? []) revalidatePath(path); }
