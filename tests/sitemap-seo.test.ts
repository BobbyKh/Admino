import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import robots from "../app/robots";
import { getTemplatePreset, TEMPLATE_PRESETS } from "../lib/templates";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("robots.txt config allows public pages and disallows admin and api routes", () => {
  const result = robots();
  assert.equal(result.rules?.userAgent, "*");
  assert.equal(result.rules?.allow, "/");
  assert.deepEqual(result.rules?.disallow, ["/admin/", "/api/"]);
  assert.ok(result.sitemap?.endsWith("/sitemap.xml"));
});

test("sitemap.ts queries published sites, pages, blog posts, and active products", () => {
  const file = source("app/sitemap.ts");
  assert.match(file, /eq\(sites\.published, true\)/);
  assert.match(file, /eq\(pages\.published, true\)/);
  assert.match(file, /eq\(blogPosts\.published, true\)/);
  assert.match(file, /eq\(products\.status, "active"\)/);
});

test("template presets registry contains valid defaults", () => {
  assert.ok(TEMPLATE_PRESETS.length >= 4);
  const ecommerce = getTemplatePreset("ecommerce");
  assert.equal(ecommerce.category, "ecommerce");
  assert.ok(ecommerce.defaultPages.length > 0);
});
