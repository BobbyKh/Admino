import "server-only";

import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartItems, carts, emailCampaigns, emailJobs, newsletterSubscribers, products, settings } from "@/lib/db/schema";
import { sendMail } from "@/lib/email";
import { createMarketingToken } from "@/lib/marketing-tokens";

export async function enqueueEmail(input: { siteId: number | null; campaignId?: number | null; subscriberId?: number | null; kind: string; idempotencyKey: string; to: string; subject: string; html: string; nextAttemptAt?: string }) {
  await db.insert(emailJobs).values({ siteId: input.siteId, campaignId: input.campaignId ?? null, subscriberId: input.subscriberId ?? null, kind: input.kind, idempotencyKey: input.idempotencyKey, toEmail: input.to.toLowerCase(), subject: input.subject, html: input.html, nextAttemptAt: input.nextAttemptAt ?? new Date().toISOString() }).onConflictDoNothing({ target: emailJobs.idempotencyKey });
}

export async function processEmailQueue(limit = 25) {
  const now = new Date();
  const staleLock = new Date(now.getTime() - 15 * 60_000).toISOString();
  const jobs = await db.transaction(async (tx) => {
    const claimed = await tx.execute(sql<{ id: number }>`
      select id from ${emailJobs}
      where (${emailJobs.status} in ('pending', 'failed') or (${emailJobs.status} = 'processing' and ${emailJobs.lockedAt} <= ${staleLock}))
        and ${emailJobs.nextAttemptAt} <= ${now.toISOString()}
      order by ${emailJobs.nextAttemptAt}, id
      for update skip locked
      limit ${limit}
    `);
    const ids = (claimed.rows as Array<{ id: number }>).map((row) => row.id);
    if (!ids.length) return [];
    return tx.update(emailJobs).set({ status: "processing", lockedAt: now.toISOString(), updatedAt: now.toISOString() }).where(inArray(emailJobs.id, ids)).returning();
  });

  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      if (job.subscriberId) {
        const [subscriber] = await db.select({ status: newsletterSubscribers.status, email: newsletterSubscribers.email }).from(newsletterSubscribers).where(eq(newsletterSubscribers.id, job.subscriberId));
        if (!subscriber || subscriber.status !== "active" || subscriber.email !== job.toEmail) {
          await db.update(emailJobs).set({ status: "dead", lastError: "Subscriber is not active.", lockedAt: null, updatedAt: new Date().toISOString() }).where(eq(emailJobs.id, job.id));
          continue;
        }
      }
      const result = await sendMail(job.siteId, job.toEmail, job.subject, job.html);
      if (result.skipped) throw new Error("SMTP is not configured.");
      await db.update(emailJobs).set({ status: "sent", attempts: job.attempts + 1, sentAt: new Date().toISOString(), lockedAt: null, lastError: null, updatedAt: new Date().toISOString() }).where(eq(emailJobs.id, job.id));
      sent += 1;
    } catch (error) {
      const attempts = job.attempts + 1;
      const dead = attempts >= job.maxAttempts;
      const delayMinutes = Math.min(60, 2 ** attempts);
      await db.update(emailJobs).set({ status: dead ? "dead" : "failed", attempts, nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000).toISOString(), lockedAt: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : "Email delivery failed.", updatedAt: new Date().toISOString() }).where(eq(emailJobs.id, job.id));
      failed += 1;
    }
  }
  await finalizeCampaigns(jobs.flatMap((job) => job.campaignId ? [job.campaignId] : []));
  return { claimed: jobs.length, sent, failed };
}

async function finalizeCampaigns(campaignIds: number[]) {
  for (const campaignId of [...new Set(campaignIds)]) {
    const remaining = await db.select({ id: emailJobs.id }).from(emailJobs).where(and(eq(emailJobs.campaignId, campaignId), inArray(emailJobs.status, ["pending", "processing", "failed"]))).limit(1);
    const dead = await db.select({ id: emailJobs.id }).from(emailJobs).where(and(eq(emailJobs.campaignId, campaignId), eq(emailJobs.status, "dead"))).limit(1);
    if (!remaining.length) await db.update(emailCampaigns).set({ status: dead.length ? "failed" : "sent", sentAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(emailCampaigns.id, campaignId));
    else await db.update(emailCampaigns).set({ status: "sending", updatedAt: new Date().toISOString() }).where(eq(emailCampaigns.id, campaignId));
  }
}

export async function enqueueDueCampaigns() {
  const now = new Date().toISOString();
  const campaigns = await db.select().from(emailCampaigns).where(and(eq(emailCampaigns.status, "scheduled"), lte(emailCampaigns.scheduledAt, now)));
  let queued = 0;
  for (const campaign of campaigns) queued += await queueCampaign(campaign.id);
  return queued;
}

export async function enqueueAbandonedCartEmails(now = new Date()) {
  const cutoff = new Date(now.getTime() - 2 * 60 * 60_000).toISOString();
  const candidates = await db.select({ cartId: carts.id, siteId: carts.siteId, token: carts.token, email: carts.email, updatedAt: carts.updatedAt }).from(carts).where(and(lte(carts.updatedAt, cutoff), sql`${carts.email} is not null`));
  let queued = 0;
  for (const cart of candidates) {
    if (!cart.email) continue;
    const [subscriber] = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.siteId, cart.siteId), eq(newsletterSubscribers.email, cart.email), eq(newsletterSubscribers.status, "active")));
    if (!subscriber) continue;
    const items = await db.select({ title: products.title }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, cart.cartId));
    if (!items.length) continue;
    const [siteName] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, cart.siteId), eq(settings.key, "siteName")));
    const base = process.env.SITE_URL ?? "http://localhost:3000";
    const cartUrl = `${base}/cart?utm_source=email&utm_medium=lifecycle&utm_campaign=abandoned_cart`;
    const token = createMarketingToken(subscriber.id, "unsubscribe", subscriber.unsubscribeTokenHash);
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>You left something in your cart</h2><p>Your ${items.length === 1 ? items[0].title : `${items.length} items`} at ${siteName?.value || "our store"} are still waiting.</p><p><a href="${cartUrl}" style="display:inline-block;background:#166534;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Return to cart</a></p><p style="margin-top:24px;color:#666;font-size:12px"><a href="${base}/newsletter/unsubscribe?token=${encodeURIComponent(token)}">Unsubscribe</a></p></div>`;
    await enqueueEmail({ siteId: cart.siteId, subscriberId: subscriber.id, kind: "abandoned_cart", idempotencyKey: `abandoned-cart:${cart.cartId}:${cart.updatedAt}`, to: subscriber.email, subject: `Your cart at ${siteName?.value || "our store"}`, html });
    queued += 1;
  }
  return queued;
}

export async function queueCampaign(campaignId: number) {
  return db.transaction(async (tx) => {
    const locked = await tx.execute(sql<{ id: number }>`select id from ${emailCampaigns} where ${emailCampaigns.id} = ${campaignId} and ${emailCampaigns.status} in ('draft', 'scheduled') for update`);
    if (!locked.rows.length) return 0;
    const [campaign] = await tx.select().from(emailCampaigns).where(eq(emailCampaigns.id, campaignId));
    const subscribers = await tx.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.siteId, campaign.siteId), eq(newsletterSubscribers.status, "active")));
    const now = new Date().toISOString();
    for (const subscriber of subscribers) {
      const html = appendUnsubscribe(injectCampaignAttribution(campaign.content, campaign.id), subscriber.id, subscriber.unsubscribeTokenHash);
      await tx.insert(emailJobs).values({ siteId: campaign.siteId, campaignId: campaign.id, subscriberId: subscriber.id, kind: campaign.type, idempotencyKey: `campaign:${campaign.id}:subscriber:${subscriber.id}`, toEmail: subscriber.email, subject: campaign.subject, html, nextAttemptAt: now }).onConflictDoNothing({ target: emailJobs.idempotencyKey });
    }
    await tx.update(emailCampaigns).set({ status: subscribers.length ? "queued" : "sent", queuedAt: now, sentAt: subscribers.length ? null : now, recipientCount: subscribers.length, updatedAt: now }).where(eq(emailCampaigns.id, campaign.id));
    return subscribers.length;
  });
}

function injectCampaignAttribution(html: string, campaignId: number) {
  return html.replace(/href=(['"])(https?:\/\/[^'"]+)\1/gi, (match, quote: string, href: string) => {
    try {
      const url = new URL(href);
      if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", "email");
      if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", "campaign");
      if (!url.searchParams.has("utm_campaign")) url.searchParams.set("utm_campaign", String(campaignId));
      return `href=${quote}${url.toString()}${quote}`;
    } catch { return match; }
  });
}

function appendUnsubscribe(html: string, subscriberId: number, tokenHash: string) {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const token = createMarketingToken(subscriberId, "unsubscribe", tokenHash);
  const url = `${base}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
  return `${html}<p style="margin-top:24px;color:#666;font-size:12px">You are receiving this because you subscribed to store updates. <a href="${url}">Unsubscribe</a></p>`;
}
