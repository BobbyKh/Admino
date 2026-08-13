import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("promotion totals are calculated centrally and persisted as order snapshots", () => {
  const totals = source("lib/commerce/totals.ts");
  const checkout = source("lib/actions/storefront-commerce.ts");
  const stripe = source("app/api/payments/stripe/checkout/route.ts");
  assert.match(totals, /calculateCommerceTotals/);
  assert.match(totals, /taxableSubtotal = Math\.max\(0, subtotal - discountAmount\)/);
  assert.match(checkout, /promotionSnapshot: verifiedTotals\.promotion \? JSON\.stringify/);
  assert.match(stripe, /calculateCommerceTotals/);
  assert.match(stripe, /total: totals\.total/);
});

test("promotion eligibility includes schedule, spend, catalog, and customer limits", () => {
  const totals = source("lib/commerce/totals.ts");
  for (const rule of ["startsAt", "endsAt", "minimumSubtotal", "usageLimit", "perCustomerLimit", "firstOrderOnly", "productIds", "categories"]) assert.match(totals, new RegExp(rule));
});

test("promotion redemptions serialize usage checks", () => {
  const redemptions = source("lib/commerce/redemptions.ts");
  assert.match(redemptions, /for update/);
  assert.match(redemptions, /ne\(orders\.status, "cancelled"\)/);
  assert.match(redemptions, /tx\.insert\(promotionRedemptions\)/);
});

test("cart exposes coupon apply and remove controls", () => {
  const cart = source("components/site/cart-page-client.tsx");
  assert.match(cart, /applyStorePromotion/);
  assert.match(cart, /removeStorePromotion/);
  assert.match(cart, /Discount code/);
  assert.match(cart, /cart\.shippingAmount/);
  assert.match(cart, /cart\.taxAmount/);
});
