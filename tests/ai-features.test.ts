import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { callAiProvider } from "../lib/ai-provider";
import { parseChatContent } from "../lib/chat-content";

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

test("text AI features reject fal image model endpoints", async () => {
  await assert.rejects(
    callAiProvider({
      provider: "custom",
      apiKey: "test-key",
      model: "fal-ai/flux/schnell",
      baseUrl: "https://fal.run/fal-ai/flux/schnell",
      systemPrompt: "test",
      userPrompt: "test",
    }),
    /image-generation endpoint, not a text AI base URL/
  );
});

test("chat content renders safe links and image URLs as structured parts", () => {
  assert.deepEqual(
    parseChatContent("See [our menu](/menu) and ![Dining room](https://cdn.example.com/room.jpg)."),
    [
      { type: "text", value: "See " },
      { type: "link", href: "/menu", label: "our menu" },
      { type: "text", value: " and " },
      { type: "image", src: "https://cdn.example.com/room.jpg", alt: "Dining room" },
      { type: "text", value: "." },
    ]
  );
});

test("chat content leaves unsafe markdown destinations as text", () => {
  assert.deepEqual(parseChatContent("[Open](javascript:alert(1))"), [
    { type: "text", value: "[Open](javascript:alert(1))" },
  ]);
});

test("chat content recognizes pasted links and direct image URLs", () => {
  assert.deepEqual(parseChatContent("Visit https://example.com, photo: https://cdn.example.com/item.webp?size=large"), [
    { type: "text", value: "Visit " },
    { type: "link", href: "https://example.com", label: "https://example.com" },
    { type: "text", value: ", photo: " },
    { type: "image", src: "https://cdn.example.com/item.webp?size=large", alt: "Shared image" },
  ]);
});
