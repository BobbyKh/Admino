import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("customer sessions are bound to the resolved storefront", () => {
  const auth = source("lib/customer-auth.ts");
  assert.match(auth, /getResolvedSiteId/);
  assert.match(auth, /eq\(customers\.siteId, siteId\)/);
});

test("checkout associates only matching authenticated customer emails", () => {
  for (const path of ["lib/actions/storefront-commerce.ts", "app/api/payments/stripe/checkout/route.ts"]) {
    const checkout = source(path);
    assert.match(checkout, /sessionCustomer\.email\.toLowerCase\(\).*email\.toLowerCase\(\)/);
    assert.match(checkout, /customerId/);
  }
});

test("reviews require paid fulfilled customer order items", () => {
  const customers = source("lib/actions/customers.ts");
  assert.match(customers, /eq\(orders\.customerId, customer\.id\)/);
  assert.match(customers, /eq\(orders\.status, "fulfilled"\)/);
  assert.match(customers, /eq\(orders\.paymentStatus, "paid"\)/);
  assert.match(customers, /target: productReviews\.orderItemId/);
});

test("loyalty awards are fulfillment-based and idempotent", () => {
  const loyalty = source("lib/commerce/loyalty.ts");
  const commerce = source("lib/actions/commerce.ts");
  assert.match(loyalty, /order_fulfilled/);
  assert.match(loyalty, /order:\$\{input\.orderId\}:fulfilled/);
  assert.match(loyalty, /onConflictDoNothing/);
  assert.match(commerce, /awardOrderLoyalty/);
});

test("recently viewed history is tenant scoped and bounded", () => {
  const customers = source("lib/actions/customers.ts");
  assert.match(customers, /recordRecentlyViewedProduct/);
  assert.match(customers, /eq\(products\.siteId, customer\.siteId\)/);
  assert.match(customers, /offset\(12\)/);
});
