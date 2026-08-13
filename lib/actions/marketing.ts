"use server";

import { and, asc, count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailCampaigns, emailJobs, newsletterSubscribers, products, settings } from "@/lib/db/schema";
import { enqueueEmail, queueCampaign } from "@/lib/email-queue";
import { getCurrentSiteRequiringFeature } from "@/lib/tenant-access";
import { escapeHtml } from "@/lib/sanitize";

async function siteId() { await requireRole("admin"); return getCurrentSiteRequiringFeature("commerce"); }

export async function getMarketingDashboard() {
  const id = await siteId();
  const [subscribers, campaigns, productRows, statusRows] = await Promise.all([
    db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.siteId, id)).orderBy(desc(newsletterSubscribers.createdAt)),
    db.select().from(emailCampaigns).where(eq(emailCampaigns.siteId, id)).orderBy(desc(emailCampaigns.createdAt)),
    db.select({ id: products.id, title: products.title, slug: products.slug, image: products.image, price: products.price, currency: products.currency }).from(products).where(and(eq(products.siteId, id), eq(products.status, "active"))).orderBy(desc(products.createdAt)),
    db.select({ status: emailJobs.status, value: count() }).from(emailJobs).where(eq(emailJobs.siteId, id)).groupBy(emailJobs.status).orderBy(asc(emailJobs.status)),
  ]);
  return { subscribers, campaigns, products: productRows, queue: Object.fromEntries(statusRows.map((row) => [row.status, row.value])) };
}

const campaignSchema = z.object({ name: z.string().trim().min(1).max(120), type: z.enum(["newsletter", "new_product"]), subject: z.string().trim().min(1).max(180), previewText: z.string().trim().max(240).optional().default(""), content: z.string().trim().min(1).max(50_000), productId: z.string().trim().optional().default(""), scheduledAt: z.string().trim().optional().default("") });

export async function createEmailCampaign(formData: FormData) {
  const id = await siteId();
  const input = campaignSchema.safeParse({ name: formData.get("name"), type: formData.get("type"), subject: formData.get("subject"), previewText: formData.get("previewText") ?? "", content: formData.get("content"), productId: formData.get("productId") ?? "", scheduledAt: formData.get("scheduledAt") ?? "" });
  if (!input.success) throw new Error(input.error.issues[0]?.message ?? "Invalid campaign.");
  const scheduledAt = input.data.scheduledAt ? new Date(input.data.scheduledAt) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) throw new Error("Enter a valid schedule date.");
  const productId = input.data.productId ? Number(input.data.productId) : null;
  if (productId && !Number.isInteger(productId)) throw new Error("Select a valid product.");
  const [campaign] = await db.insert(emailCampaigns).values({ siteId: id, name: input.data.name, type: input.data.type, subject: input.data.subject, previewText: input.data.previewText || null, content: input.data.content, productId, audience: "all_subscribers", status: scheduledAt ? "scheduled" : "draft", scheduledAt: scheduledAt?.toISOString() ?? null }).returning();
  revalidate();
  return campaign.id;
}

export async function queueEmailCampaign(campaignId: number) { const id = await siteId(); const [campaign] = await db.select().from(emailCampaigns).where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.siteId, id))); if (!campaign) throw new Error("Campaign not found."); const recipients = await queueCampaign(campaign.id); revalidate(); return recipients; }
export async function deleteEmailCampaign(campaignId: number) { const id = await siteId(); await db.delete(emailCampaigns).where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.siteId, id), eq(emailCampaigns.status, "draft"))); revalidate(); }

export async function sendCampaignTest(campaignId: number, email: string) {
  const id = await siteId();
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) throw new Error("Enter a valid test email.");
  const [campaign] = await db.select().from(emailCampaigns).where(and(eq(emailCampaigns.id, campaignId), eq(emailCampaigns.siteId, id)));
  if (!campaign) throw new Error("Campaign not found.");
  await enqueueEmail({ siteId: id, campaignId: null, kind: "campaign_test", idempotencyKey: `campaign-test:${campaign.id}:${parsed.data.toLowerCase()}:${Date.now()}`, to: parsed.data, subject: `[TEST] ${campaign.subject}`, html: campaign.content });
  revalidate();
}

export async function createNewProductCampaign(productId: number) {
  const id = await siteId();
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.siteId, id), eq(products.status, "active")));
  if (!product) throw new Error("Active product not found.");
  const [siteName] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, id), eq(settings.key, "siteName")));
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const productUrl = `${base}/products/${encodeURIComponent(product.slug)}`;
  const image = product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" style="max-width:100%;border-radius:12px">` : "";
  const content = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><p style="color:#166534;font-weight:600">New at ${escapeHtml(siteName?.value || "our store")}</p><h1>${escapeHtml(product.title)}</h1>${image}<p>${escapeHtml(product.description || "Discover our latest product.")}</p><p><a href="${escapeHtml(productUrl)}" style="display:inline-block;background:#166534;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">View product</a></p></div>`;
  const [campaign] = await db.insert(emailCampaigns).values({ siteId: id, name: `New product: ${product.title}`, type: "new_product", subject: `New arrival: ${product.title}`, previewText: product.description?.slice(0, 180) || null, content, productId: product.id, status: "draft", audience: "all_subscribers" }).returning();
  revalidate();
  return campaign.id;
}

function revalidate() { revalidatePath("/admin/commerce/marketing"); }
