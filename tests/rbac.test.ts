import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { hasMinRole, hasPermission } from "../lib/roles";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("role hierarchy prevents viewers from mutating content", () => {
  assert.equal(hasMinRole("viewer", "editor"), false);
  assert.equal(hasMinRole("editor", "editor"), true);
  assert.equal(hasMinRole("admin", "editor"), true);
  assert.equal(hasMinRole("super_admin", "admin"), true);
  assert.equal(hasMinRole("admin", "super_admin"), false);
});

test("role permissions preserve read-only viewer access", () => {
  assert.equal(hasPermission("viewer", "read"), true);
  assert.equal(hasPermission("viewer", "write"), false);
  assert.equal(hasPermission("editor", "write"), true);
  assert.equal(hasPermission("admin", "manage_users"), true);
  assert.equal(hasPermission("admin", "manage_site"), false);
  assert.equal(hasPermission("super_admin", "manage_site"), true);
});

test("content mutation modules require editor role", () => {
  for (const path of [
    "lib/actions/gallery.ts",
    "lib/actions/home-sections.ts",
    "lib/actions/menu.ts",
    "lib/actions/navigation.ts",
    "lib/actions/media.ts",
    "lib/actions/uploads.ts",
  ]) {
    assert.match(source(path), /ForRole\([^\n]+"editor"\)/, path);
  }
});

test("sensitive tenant operations require admin role", () => {
  for (const path of [
    "lib/actions/layout.ts",
    "lib/actions/settings.ts",
    "lib/actions/admin-customers.ts",
    "lib/actions/experiments.ts",
    "lib/actions/funnels.ts",
    "lib/actions/webhooks.ts",
  ]) {
    assert.match(source(path), /("admin"|ForRole\([^\n]+"admin"\))/, path);
  }
});

test("global billing administration requires super admin role", () => {
  const file = source("lib/actions/billing.ts");
  assert.match(file, /adminCreatePlan[\s\S]*?requireActionRole\("super_admin"\)/);
  assert.match(file, /adminDeletePlan[\s\S]*?requireActionRole\("super_admin"\)/);
  assert.match(file, /getAllSubscriptions[\s\S]*?requireActionRole\("super_admin"\)/);
});

test("subscription routes authorize the active admin tenant", () => {
  for (const path of [
    "app/api/payments/stripe/subscription-checkout/route.ts",
    "app/api/payments/stripe/portal/route.ts",
  ]) {
    const file = source(path);
    assert.match(file, /requireActionRole\("admin"\)/, path);
    assert.match(file, /getAdminSiteId\(\)/, path);
    assert.doesNotMatch(file, /getSiteForRequest|siteUrl/, path);
  }
});

test("billing actions call trusted services without internal HTTP requests", () => {
  const file = source("lib/actions/billing.ts");
  assert.match(file, /createSubscriptionCheckout/);
  assert.match(file, /createSubscriptionPortal/);
  assert.doesNotMatch(file, /fetch\(`/);
});

test("locale deletion scopes translations through tenant pages and blocks", () => {
  const file = source("lib/actions/i18n.ts");
  assert.match(file, /inArray\(pageTranslations\.pageId, pageIds\)/);
  assert.match(file, /inArray\(blockTranslations\.blockId, blockIds\)/);
  assert.match(file, /getSiteLocalesById\(page\.siteId\)/);
  assert.match(file, /isSiteLocale\(page\.siteId, locale\)/);
});

test("AI translation stores locale rows only for blocks from the authorized page", () => {
  const file = source("lib/actions/translation-ai.ts");
  assert.match(file, /allowedBlockIds\.has\(item\.id\)/);
  assert.match(file, /eq\(pageBlocks\.pageId, pageId\)/);
  assert.match(file, /tx\.insert\(blockTranslations\)/);
  assert.doesNotMatch(file, /tx\.update\(pageBlocks\)/);
});
