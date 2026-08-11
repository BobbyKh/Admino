import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("Nepali is normalized and added after a physical English source locale", () => {
  const actions = source("lib/actions/i18n.ts");
  const sites = source("lib/actions/sites.ts");
  assert.match(actions, /\^\[a-z\]\{2,3\}/);
  assert.match(actions, /Use a valid language code such as ne or ne-np/);
  assert.match(actions, /ensureSourceLocale\(siteId\)/);
  assert.match(actions, /code: DEFAULT_LOCALE/);
  assert.match(sites, /code: "en", name: "English", isDefault: true/);
});

test("storefront validates and displays the selected tenant locale", () => {
  const i18n = source("lib/i18n.ts");
  const layout = source("app/(site)/layout.tsx");
  const navbar = source("components/site/navbar.tsx");
  assert.match(i18n, /matchLocale\(cookieLocale, localeCodes\)/);
  assert.match(i18n, /const base = code\.split\("-"\)\[0\]/);
  assert.match(layout, /getResolvedLocale\(\)/);
  assert.match(layout, /currentLocale=\{currentLocale\}/);
  assert.match(navbar, /currentLocale=\{currentLocale\}/);
  assert.doesNotMatch(navbar, /currentLocale=\{locales\.find/);
});

test("storefront pages render translated page and block content", () => {
  for (const path of ["app/(site)/page.tsx", "app/(site)/[slug]/page.tsx"]) {
    const page = source(path);
    assert.match(page, /getResolvedLocale/);
    assert.match(page, /getTranslatedPageBlocks/);
  }
  assert.match(source("app/(site)/[slug]/page.tsx"), /getTranslatedPage\(sourcePage\.id, locale\)/);
});

test("AI translation writes locale-specific rows without changing source blocks", () => {
  const action = source("lib/actions/translation-ai.ts");
  assert.match(action, /eq\(siteLocales\.code, localeCode\)/);
  assert.match(action, /tx\.insert\(blockTranslations\)/);
  assert.match(action, /blockTranslations\.locale/);
  assert.doesNotMatch(action, /tx\.update\(pageBlocks\)/);
});
