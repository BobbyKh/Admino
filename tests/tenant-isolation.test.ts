import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function compact(value: string) {
  return value.replace(/\s+/g, " ");
}

test("tenant export requires site access and excludes secrets", () => {
  const file = source("lib/actions/export.ts");
  assert.match(file, /await requireSiteAccess\(siteId\)/);
  assert.match(file, /SECRET_SETTING_KEYS/);
  assert.doesNotMatch(file, /adminUsers|passwordResetTokens|rateLimitBuckets/);
  assert.match(compact(file), /from\(settings\)\.where\(and\(eq\(settings\.siteId, siteId\), notInArray\(settings\.key, secretKeys\)\)\)/);
});

test("tenant export filters direct tenant tables by site id", () => {
  const file = compact(source("lib/actions/export.ts"));
  const tables = [
    "pages",
    "carts",
    "orders",
    "navLinks",
    "galleryImages",
    "media",
    "menuCategories",
    "menuItems",
    "bookings",
    "messages",
    "paymentConfigurations",
    "products",
    "blogPosts",
    "serviceCategories",
    "services",
  ];

  for (const table of tables) {
    assert.match(file, new RegExp(`from\\(${table}\\)\\.where\\(eq\\(${table}\\.siteId, siteId\\)\\)`), `${table} must be exported through siteId`);
  }
});

test("tenant export reads child rows through tenant-scoped parent ids", () => {
  const file = compact(source("lib/actions/export.ts"));
  assert.match(file, /const pageIds = sitePages\.map/);
  assert.match(file, /const cartIds = siteCarts\.map/);
  assert.match(file, /const orderIds = siteOrders\.map/);
  assert.match(file, /from\(pageBlocks\)\.where\(inArray\(pageBlocks\.pageId, pageIds\)\)/);
  assert.match(file, /from\(pageRevisions\).*where\(inArray\(pageRevisions\.pageId, pageIds\)\)/);
  assert.match(file, /from\(cartItems\)\.where\(inArray\(cartItems\.cartId, cartIds\)\)/);
  assert.match(file, /from\(orderItems\)\.where\(inArray\(orderItems\.orderId, orderIds\)\)/);
});

test("storefront cart actions resolve tenant from request context", () => {
  const file = source("lib/actions/storefront-commerce.ts");
  assert.match(file, /async function getStoreSiteId\(\)/);
  assert.match(file, /getResolvedSiteId\(\)/);
  assert.match(compact(file), /from\(products\)\.where\(and\(eq\(products\.id, productId\), eq\(products\.siteId, siteId\), eq\(products\.status, "active"\)\)\)/);
  assert.match(compact(file), /from\(carts\)\.where\(and\(eq\(carts\.token, parsed\.data\), eq\(carts\.siteId, siteId\)\)\)/);
});

test("admin page actions guard supplied ids before mutations", () => {
  const file = source("lib/actions/pages.ts");
  assert.match(file, /const page = await requirePageAccess\(id\)/);
  assert.match(file, /const page = await requirePageAccess\(pageId\)/);
  assert.match(file, /const block = await requirePageBlockAccess\(id\)/);
  assert.match(file, /const user = await requireSiteAccess\(siteId\)/);
  assert.match(file, /eq\(pages\.siteId, page\.siteId\)/);
});

test("public product data only exposes active products for current tenant", () => {
  const file = compact(source("lib/data.ts"));
  assert.match(file, /export const getActiveProducts/);
  assert.match(file, /where\(and\(eq\(products\.siteId, siteId\), eq\(products\.status, "active"\)\)\)/);
  assert.match(file, /export const getActiveProductBySlug/);
  assert.match(file, /where\(and\(eq\(products\.siteId, siteId\), eq\(products\.slug, slug\), eq\(products\.status, "active"\)\)\)/);
});
