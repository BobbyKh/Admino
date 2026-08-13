import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("marketplace is an explicit per-site feature that defaults off", () => {
  const constants = source("lib/tenant-features-constants.ts");
  const features = source("lib/tenant-features.ts");
  assert.match(constants, /"marketplace"/);
  assert.match(constants, /DEFAULT_TENANT_FEATURES.*feature !== "marketplace"/);
  assert.match(features, /return \[\.\.\.DEFAULT_TENANT_FEATURES\]/);
  assert.match(features, /feature === "marketplace" \? features\.includes\(feature\) : true/);
});

test("seller applications are rate limited and tenant scoped", () => {
  const marketplace = source("lib/actions/marketplace.ts");
  assert.match(marketplace, /checkRateLimit\(`seller-application:\$\{siteId\}:\$\{ip\}`\)/);
  assert.match(marketplace, /eq\(sellerApplications\.siteId, siteId\)/);
  assert.match(marketplace, /isMarketplaceEnabled\(siteId\)/);
});

test("seller review requires explicit marketplace access and creates stores atomically", () => {
  const marketplace = source("lib/actions/marketplace.ts");
  assert.match(marketplace, /requireSiteFeatureForRole\(siteId, "marketplace", "admin"\)/);
  assert.match(marketplace, /db\.transaction/);
  assert.match(marketplace, /eq\(sellerApplications\.status, "pending"\)/);
  assert.match(marketplace, /tx\.insert\(sellerOrganizations\)/);
  assert.match(marketplace, /tx\.insert\(sellerStores\)/);
});

test("marketplace navigation is hidden behind its own feature", () => {
  const nav = source("components/admin/admin-nav.tsx");
  assert.match(nav, /Marketplace Sellers.*feature: "marketplace"/);
});
