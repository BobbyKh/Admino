"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { newsletterSubscribers, settings } from "@/lib/db/schema";
import { enqueueEmail } from "@/lib/email-queue";
import { createMarketingToken, randomTokenHash, verifyMarketingToken } from "@/lib/marketing-tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import { getResolvedSite, getResolvedSiteId } from "@/lib/site-context";
import { escapeHtml } from "@/lib/sanitize";

const CONSENT_TEXT = "I agree to receive product news and marketing emails. I can unsubscribe at any time.";

export async function subscribeNewsletter(_previous: unknown, formData: FormData) {
  const siteId = await getResolvedSiteId();
  if (!siteId) return { success: false, message: "Store not found." };
  const input = z.object({ email: z.string().trim().email(), source: z.string().trim().max(80), locale: z.string().trim().min(2).max(10), consent: z.literal("on") }).safeParse({ email: formData.get("email"), source: formData.get("source") ?? "newsletter", locale: formData.get("locale") ?? "en", consent: formData.get("consent") });
  if (!input.success) return { success: false, message: "Enter a valid email and agree to receive updates." };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (!(await checkRateLimit(`newsletter:${siteId}:${ip}`)).allowed) return { success: false, message: "Too many requests. Please try again shortly." };

  const email = input.data.email.toLowerCase();
  const [existing] = await db.select().from(newsletterSubscribers).where(and(eq(newsletterSubscribers.siteId, siteId), eq(newsletterSubscribers.email, email)));
  if (existing?.status === "active") return { success: true, message: "You are already subscribed." };
  if (existing?.status === "suppressed") return { success: true, message: "If this address can receive updates, a confirmation email will arrive shortly." };

  const confirmationNonce = randomTokenHash();
  const unsubscribeNonce = existing?.unsubscribeTokenHash ?? randomTokenHash();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
  const values = { status: "pending", source: input.data.source, locale: input.data.locale, consentText: CONSENT_TEXT, consentIp: ip, consentUserAgent: requestHeaders.get("user-agent"), confirmationTokenHash: confirmationNonce, unsubscribeTokenHash: unsubscribeNonce, confirmationExpiresAt: expiresAt, confirmedAt: null, unsubscribedAt: null, updatedAt: new Date().toISOString() };
  const [subscriber] = existing
    ? await db.update(newsletterSubscribers).set(values).where(eq(newsletterSubscribers.id, existing.id)).returning()
    : await db.insert(newsletterSubscribers).values({ siteId, email, ...values }).returning();

  const site = await getResolvedSite();
  const siteName = await getSiteName(siteId);
  const base = site?.domain ? `https://${site.domain}` : process.env.SITE_URL ?? "http://localhost:3000";
  const token = createMarketingToken(subscriber.id, "confirm", confirmationNonce);
  const confirmUrl = `${base}/newsletter/confirm?token=${encodeURIComponent(token)}`;
  await enqueueEmail({ siteId, subscriberId: null, kind: "newsletter_confirmation", idempotencyKey: `newsletter-confirm:${subscriber.id}:${confirmationNonce}`, to: email, subject: `Confirm your subscription to ${siteName}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Confirm your subscription</h2><p>Confirm that you want product news and offers from ${escapeHtml(siteName)}.</p><p><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#166534;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Confirm subscription</a></p><p style="color:#666;font-size:12px">This link expires in 24 hours.</p></div>` });
  return { success: true, message: "Check your email to confirm your subscription." };
}

export async function confirmNewsletterToken(token: string) {
  const subscriberId = Number(token.split(".")[0]);
  if (!Number.isInteger(subscriberId)) return false;
  const [subscriber] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId));
  if (!subscriber?.confirmationTokenHash || subscriber.status !== "pending" || !verifyMarketingToken(token, "confirm", subscriber.confirmationTokenHash) || !subscriber.confirmationExpiresAt || subscriber.confirmationExpiresAt < new Date().toISOString()) return false;
  await db.update(newsletterSubscribers).set({ status: "active", confirmedAt: new Date().toISOString(), confirmationTokenHash: null, confirmationExpiresAt: null, updatedAt: new Date().toISOString() }).where(eq(newsletterSubscribers.id, subscriber.id));
  return true;
}

export async function unsubscribeNewsletterToken(token: string) {
  const subscriberId = Number(token.split(".")[0]);
  if (!Number.isInteger(subscriberId)) return false;
  const [subscriber] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId));
  if (!subscriber || !verifyMarketingToken(token, "unsubscribe", subscriber.unsubscribeTokenHash)) return false;
  await db.update(newsletterSubscribers).set({ status: "unsubscribed", unsubscribedAt: new Date().toISOString(), confirmationTokenHash: null, confirmationExpiresAt: null, updatedAt: new Date().toISOString() }).where(eq(newsletterSubscribers.id, subscriber.id));
  return true;
}

async function getSiteName(siteId: number) { const [row] = await db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, "siteName"))); return row?.value || "Store"; }
