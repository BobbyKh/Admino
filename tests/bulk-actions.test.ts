import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("bulk actions are bounded, deduplicated, and explicitly tenant authorized", () => {
  const bulk = source("lib/actions/bulk.ts");
  assert.match(bulk, /max\(100\)/);
  assert.match(bulk, /\[\.\.\.new Set\(input\.ids\)\]/);
  assert.match(bulk, /requireSiteFeatureForRole\(siteId/);
  assert.match(bulk, /eq\(table\.siteId, siteId\)/);
});

test("bulk results expose per-record partial failures", () => {
  const types = source("lib/actions/types.ts");
  const scope = source("components/admin/bulk-selection-scope.tsx");
  assert.match(types, /BulkItemResult/);
  assert.match(types, /succeeded: number/);
  assert.match(types, /failed: number/);
  assert.match(scope, /result\.failed/);
});

test("destructive bulk actions require confirmation", () => {
  const bar = source("components/admin/bulk-action-bar.tsx");
  assert.match(bar, /AlertDialog/);
  assert.match(bar, /option\?\.destructive/);
});

test("bulk operations create activity records", () => {
  const bulk = source("lib/actions/bulk.ts");
  assert.match(bulk, /entity: "bulk_operation"/);
  assert.match(bulk, /succeeded: result\.succeeded/);
  assert.match(bulk, /failed: result\.failed/);
});

test("high-risk operations are not exposed as generic bulk mutations", () => {
  const bulk = source("lib/actions/bulk.ts");
  assert.doesNotMatch(bulk, /approveOrderPayment/);
  assert.doesNotMatch(bulk, /reviewSellerApplication/);
  assert.doesNotMatch(bulk, /deleteMediaItem/);
  assert.doesNotMatch(bulk, /deleteAdminCustomer/);
});

test("marketplace sellers expose guarded bulk activation and suspension", () => {
  const bulk = source("lib/actions/bulk.ts");
  const sellers = source("components/admin/seller-manager.tsx");
  assert.match(bulk, /entity === "sellers" \? "marketplace"/);
  assert.match(bulk, /updateSellerStatuses/);
  assert.match(bulk, /tx\.update\(sellerOrganizations\)/);
  assert.match(bulk, /tx\.update\(sellerStores\)/);
  assert.match(sellers, /entity="sellers"/);
  assert.match(sellers, /Activate sellers and stores/);
  assert.match(sellers, /Suspend sellers and stores/);
});

test("canonical admin managers use shared bulk selection", () => {
  for (const path of [
    "components/admin/product-manager.tsx",
    "components/admin/blog-manager.tsx",
    "components/admin/orders-manager.tsx",
    "components/admin/service-manager.tsx",
    "app/admin/(panel)/messages/page.tsx",
    "app/admin/(panel)/bookings/page.tsx",
    "app/admin/(panel)/navigation/page.tsx",
    "app/admin/(panel)/menu/page.tsx",
    "app/admin/(panel)/pages/page.tsx",
    "app/admin/(panel)/gallery/page.tsx",
    "app/admin/(panel)/webhooks/page.tsx",
    "app/admin/(panel)/experiments/page.tsx",
    "app/admin/(panel)/funnels/page.tsx",
    "app/admin/(panel)/errors/page.tsx",
  ]) assert.match(source(path), /BulkSelectionScope/);
});
