import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("seller authentication is isolated from builder admin authentication", () => {
  const auth = source("lib/seller-auth.ts");
  const proxy = source("proxy.ts");
  assert.match(auth, /admino_seller_session/);
  assert.match(auth, /setAudience\(SELLER_SESSION_AUDIENCE\)/);
  assert.match(auth, /audience: SELLER_SESSION_AUDIENCE/);
  assert.doesNotMatch(auth, /adminUsers/);
  assert.match(proxy, /SELLER_SESSION_COOKIE/);
  assert.match(proxy, /"admino-seller"/);
});

test("seller invitations are hashed, expiring, and consumed once", () => {
  const marketplace = source("lib/actions/marketplace.ts");
  const seller = source("lib/actions/seller.ts");
  assert.match(marketplace, /randomBytes\(32\)/);
  assert.match(marketplace, /createHash\("sha256"\)/);
  assert.match(marketplace, /expiresAt: new Date/);
  assert.match(seller, /isNull\(sellerInvitations\.acceptedAt\)/);
  assert.match(seller, /tx\.update\(sellerInvitations\).*acceptedAt/);
});

test("seller catalog mutations derive ownership from authenticated membership", () => {
  const seller = source("lib/actions/seller.ts");
  assert.match(seller, /const seller = await requireSellerAction\(\)/);
  assert.match(seller, /sellerId: seller\.sellerId, storeId: seller\.storeId/);
  assert.match(seller, /eq\(products\.siteId, seller\.siteId\)[\s\S]*eq\(products\.sellerId, seller\.sellerId\)[\s\S]*eq\(products\.storeId, seller\.storeId\)/);
  assert.doesNotMatch(seller, /formData\.get\("sellerId"\)/);
});

test("order items snapshot marketplace attribution at checkout", () => {
  const storefront = source("lib/actions/storefront-commerce.ts");
  const stripe = source("app/api/payments/stripe/checkout/route.ts");
  assert.match(storefront, /sellerId: item\.sellerId, storeId: item\.storeId/);
  assert.match(stripe, /sellerId: item\.sellerId/);
  assert.match(stripe, /storeId: item\.storeId/);
});
