import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhooks, webhookDeliveries } from "@/lib/db/schema";

export type WebhookEvent =
  | "order.created"
  | "order.paid"
  | "order.fulfilled"
  | "order.cancelled"
  | "form.submitted"
  | "page.published"
  | "page.created"
  | "product.created"
  | "product.updated"
  | "customer.registered"
  | "booking.created"
  | "message.received"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cancelled"
  | "subscription.payment_failed";

const EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  "order.created": "A new order has been placed",
  "order.paid": "An order payment has been confirmed",
  "order.fulfilled": "An order has been fulfilled",
  "order.cancelled": "An order has been cancelled",
  "form.submitted": "A form submission was received",
  "page.published": "A page has been published",
  "page.created": "A new page has been created",
  "product.created": "A new product has been added",
  "product.updated": "A product has been updated",
  "customer.registered": "A new customer has registered",
  "booking.created": "A new booking has been made",
  "message.received": "A new contact message was received",
  "subscription.created": "A new subscription was created",
  "subscription.updated": "A subscription was updated",
  "subscription.cancelled": "A subscription was cancelled",
  "subscription.payment_failed": "A subscription payment failed",
};

export const WEBHOOK_EVENTS = Object.keys(EVENT_DESCRIPTIONS) as WebhookEvent[];

export function getEventDescription(event: WebhookEvent): string {
  return EVENT_DESCRIPTIONS[event] ?? event;
}

async function signPayload(payload: string, secret: string | null): Promise<Record<string, string>> {
  if (!secret) return {};

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(payload);

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

  return {
    "X-Webhook-Signature": `sha256=${hexSignature}`,
    "X-Webhook-Timestamp": String(Math.floor(Date.now() / 1000)),
  };
}

export async function dispatchWebhook(
  siteId: number,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const siteWebhooks = await db
    .select()
    .from(webhooks)
    .where(and(eq(webhooks.siteId, siteId), eq(webhooks.active, true)));

  for (const hook of siteWebhooks) {
    const subscribedEvents = JSON.parse(hook.events) as string[];
    if (!subscribedEvents.includes(event) && !subscribedEvents.includes("*")) continue;

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      siteId,
      data: payload,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Admino-Webhook/1.0",
      ...(await signPayload(body, hook.secret)),
    };

    // Create delivery record
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        webhookId: hook.id,
        event,
        payload: body,
        status: "pending",
      })
      .returning({ id: webhookDeliveries.id });

    // Deliver asynchronously (fire-and-forget)
    deliverWebhook(delivery.id, hook.url, body, headers).catch((err) => {
      console.error(`[Webhook] Delivery failed for hook ${hook.id}:`, err);
    });
  }
}

async function deliverWebhook(
  deliveryId: number,
  url: string,
  body: string,
  headers: Record<string, string>
): Promise<void> {
  const MAX_ATTEMPTS = 3;
  const RETRY_DELAYS = [5000, 30000, 120000]; // 5s, 30s, 2min

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await db
        .update(webhookDeliveries)
        .set({ attempts: attempt })
        .where(eq(webhookDeliveries.id, deliveryId));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text().catch(() => "");

      if (response.ok) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "success",
            statusCode: response.status,
            response: responseBody.slice(0, 1000),
          })
          .where(eq(webhookDeliveries.id, deliveryId));
        return;
      }

      // Non-retryable client errors (4xx except 408, 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "failed",
            statusCode: response.status,
            response: responseBody.slice(0, 1000),
          })
          .where(eq(webhookDeliveries.id, deliveryId));
        return;
      }
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        await db
          .update(webhookDeliveries)
          .set({
            status: "failed",
            response: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(webhookDeliveries.id, deliveryId));
        return;
      }
    }

    // Wait before retry
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt - 1] ?? 30000));
  }
}
