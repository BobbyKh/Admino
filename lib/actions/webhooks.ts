"use server";

import { and, eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { webhooks, webhookDeliveries } from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";
import { requireAdmin } from "@/lib/auth";
import { WEBHOOK_EVENTS, getEventDescription, type WebhookEvent } from "@/lib/webhooks";

// ─── Public (admin) Actions ──────────────────────────────────────────────────

export async function getWebhookEvents() {
  return WEBHOOK_EVENTS.map((event) => ({
    event,
    description: getEventDescription(event),
  }));
}

export async function getWebhooks() {
  const user = await requireAdmin();
  if (!user.siteId) return [];

  return db
    .select()
    .from(webhooks)
    .where(eq(webhooks.siteId, user.siteId))
    .orderBy(desc(webhooks.createdAt));
}

const webhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  secret: z.string().max(200).optional(),
  events: z.array(z.string()).min(1),
});

export async function createWebhook(_prev: unknown, formData: FormData) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const eventsRaw = formData.get("events") as string;
  let events: string[];
  try {
    events = JSON.parse(eventsRaw);
  } catch {
    return { success: false, message: "Invalid events format." };
  }

  const parsed = webhookSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    secret: formData.get("secret") || undefined,
    events,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  await db.insert(webhooks).values({
    siteId: user.siteId,
    ...parsed.data,
    events: JSON.stringify(parsed.data.events),
  });

  revalidatePath("/admin/webhooks");
  return { success: true, message: "Webhook created." };
}

export async function deleteWebhook(webhookId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  await db
    .delete(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.siteId, user.siteId)));

  revalidatePath("/admin/webhooks");
  return { success: true, message: "Webhook deleted." };
}

export async function toggleWebhook(webhookId: number, active: boolean) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  await db
    .update(webhooks)
    .set({ active, updatedAt: new Date().toISOString() })
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.siteId, user.siteId)));

  revalidatePath("/admin/webhooks");
  return { success: true, message: active ? "Webhook enabled." : "Webhook disabled." };
}

export async function getWebhookDeliveries(webhookId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return [];

  // Verify the webhook belongs to this site
  const [hook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, webhookId), eq(webhooks.siteId, user.siteId)));

  if (!hook) return [];

  return db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, webhookId))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(50);
}

export async function retryWebhookDelivery(deliveryId: number) {
  const user = await requireAdmin();
  if (!user.siteId) return { success: false, message: "No site assigned." };

  const [delivery] = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.id, deliveryId));

  if (!delivery) return { success: false, message: "Delivery not found." };

  const [hook] = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.id, delivery.webhookId), eq(webhooks.siteId, user.siteId)));

  if (!hook) return { success: false, message: "Webhook not found." };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Admino-Webhook/1.0",
  };

  if (hook.secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(hook.secret);
    const data = encoder.encode(delivery.payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    const hexSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    headers["X-Webhook-Signature"] = `sha256=${hexSignature}`;
    headers["X-Webhook-Timestamp"] = String(Math.floor(Date.now() / 1000));
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(hook.url, {
      method: "POST",
      headers,
      body: delivery.payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseBody = await response.text().catch(() => "");

    await db
      .update(webhookDeliveries)
      .set({
        status: response.ok ? "success" : "failed",
        statusCode: response.status,
        response: responseBody.slice(0, 1000),
        attempts: delivery.attempts + 1,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    return { success: true, message: response.ok ? "Retry successful." : `Failed: ${response.status}` };
  } catch (error) {
    await db
      .update(webhookDeliveries)
      .set({
        status: "failed",
        response: error instanceof Error ? error.message : "Unknown error",
        attempts: delivery.attempts + 1,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    return { success: false, message: "Retry failed." };
  }
}
