import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, newsletterSubscribers, settings, wishlists } from "@/lib/db/schema";
import type { Product } from "@/lib/db/schema";
import { enqueueEmail } from "@/lib/email-queue";
import { createMarketingToken } from "@/lib/marketing-tokens";
import { escapeHtml } from "@/lib/sanitize";

export async function enqueueProductLifecycleEmails({ siteId, previous, next }: { siteId: number; previous: Product; next: Product }) {
  const backInStock = previous.inventoryQuantity < 1 && next.inventoryQuantity > 0;
  const priceDrop = next.price < previous.price;
  if (!backInStock && !priceDrop) return 0;
  const rows = await db.select({ subscriber: newsletterSubscribers }).from(wishlists).innerJoin(customers, eq(wishlists.customerId, customers.id)).innerJoin(newsletterSubscribers, and(eq(newsletterSubscribers.siteId, customers.siteId), eq(newsletterSubscribers.email, customers.email), eq(newsletterSubscribers.status, "active"))).where(and(eq(customers.siteId, siteId), eq(wishlists.productId, next.id)));
  const [siteName] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, "siteName")));
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const kind = backInStock ? "back_in_stock" : "price_drop";
  const subject = backInStock ? `${next.title} is back in stock` : `Price drop: ${next.title}`;
  for (const { subscriber } of rows) {
    const unsubscribe = createMarketingToken(subscriber.id, "unsubscribe", subscriber.unsubscribeTokenHash);
    const productUrl = `${base}/products/${encodeURIComponent(next.slug)}?utm_source=email&utm_medium=lifecycle&utm_campaign=${kind}`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><p style="color:#166534;font-weight:600">${escapeHtml(siteName?.value || "Store update")}</p><h2>${escapeHtml(subject)}</h2>${next.image ? `<img src="${escapeHtml(next.image)}" alt="${escapeHtml(next.title)}" style="max-width:100%;border-radius:12px">` : ""}<p><a href="${escapeHtml(productUrl)}" style="display:inline-block;background:#166534;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">View product</a></p><p style="margin-top:24px;color:#666;font-size:12px"><a href="${base}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribe)}">Unsubscribe</a></p></div>`;
    await enqueueEmail({ siteId, subscriberId: subscriber.id, kind, idempotencyKey: `${kind}:product:${next.id}:subscriber:${subscriber.id}:change:${next.updatedAt}`, to: subscriber.email, subject, html });
  }
  return rows.length;
}
