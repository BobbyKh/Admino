import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("newsletter uses double opt-in with consent and signed tokens", () => {
  const newsletter = source("lib/actions/newsletter.ts");
  const tokens = source("lib/marketing-tokens.ts");
  assert.match(newsletter, /CONSENT_TEXT/);
  assert.match(newsletter, /status: "pending"/);
  assert.match(newsletter, /confirmationExpiresAt/);
  assert.match(newsletter, /checkRateLimit/);
  assert.match(tokens, /timingSafeEqual/);
  assert.match(tokens, /purpose: "confirm" \| "unsubscribe"/);
});

test("email queue claims jobs safely and retries to dead letter", () => {
  const queue = source("lib/email-queue.ts");
  assert.match(queue, /for update skip locked/);
  assert.match(queue, /idempotencyKey/);
  assert.match(queue, /maxAttempts/);
  assert.match(queue, /dead \? "dead" : "failed"/);
  assert.match(queue, /Subscriber is not active/);
});

test("campaign delivery includes unsubscribe and attribution", () => {
  const queue = source("lib/email-queue.ts");
  assert.match(queue, /createMarketingToken\(subscriberId, "unsubscribe"/);
  assert.match(queue, /utm_source/);
  assert.match(queue, /utm_campaign/);
});

test("new-product campaigns use active tenant products", () => {
  const marketing = source("lib/actions/marketing.ts");
  assert.match(marketing, /createNewProductCampaign/);
  assert.match(marketing, /eq\(products\.status, "active"\)/);
  assert.match(marketing, /type: "new_product"/);
});

test("lifecycle email segments require active subscriber consent", () => {
  const lifecycle = source("lib/marketing-lifecycle.ts");
  const queue = source("lib/email-queue.ts");
  assert.match(lifecycle, /back_in_stock/);
  assert.match(lifecycle, /price_drop/);
  assert.match(lifecycle, /eq\(newsletterSubscribers\.status, "active"\)/);
  assert.match(queue, /abandoned_cart/);
  assert.match(queue, /eq\(newsletterSubscribers\.status, "active"\)/);
});
