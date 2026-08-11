import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("seo-ai.ts exports generateSeoMetadataWithAi action", () => {
  const file = source("lib/actions/seo-ai.ts");
  assert.match(file, /export async function generateSeoMetadataWithAi/);
  assert.match(file, /metaTitle/);
  assert.match(file, /metaDescription/);
});

test("blog-ai.ts exports generateBlogPostWithAi action", () => {
  const file = source("lib/actions/blog-ai.ts");
  assert.match(file, /export async function generateBlogPostWithAi/);
  assert.match(file, /ai_block_assistant/);
  assert.match(file, /excerpt/);
});

test("product-ai.ts exports generateProductDescriptionWithAi action", () => {
  const file = source("lib/actions/product-ai.ts");
  assert.match(file, /export async function generateProductDescriptionWithAi/);
  assert.match(file, /badge/);
  assert.match(file, /callAiProvider/);
});
