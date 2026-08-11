import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("sites.ts exports applyTemplatePreset action", () => {
  const file = source("lib/actions/sites.ts");
  assert.match(file, /export async function applyTemplatePreset/);
  assert.match(file, /await requireRole\("super_admin"\)/);
  assert.match(file, /getTemplatePreset\(templateId\)/);
});

test("layout.ts exports updateThemeCustomizerSettings action", () => {
  const file = source("lib/actions/layout.ts");
  assert.match(file, /export async function updateThemeCustomizerSettings/);
  assert.match(file, /site_theme_customizer/);
});

test("analytics-actions.ts guards dashboard queries by site access", () => {
  const file = source("lib/actions/analytics-actions.ts");
  assert.match(file, /await requireSiteAccess\(siteId\)/);
  assert.match(file, /coalesce\(sum\(\${orders\.total}\), 0\)/);
});

test("settings.ts exports sendTestEmailAction guarded by tenant settings access", () => {
  const file = source("lib/actions/settings.ts");
  assert.match(file, /export async function sendTestEmailAction/);
  assert.match(file, /getCurrentSiteWithFeature\("settings"\)/);
  assert.match(file, /sendTestEmail/);
});
