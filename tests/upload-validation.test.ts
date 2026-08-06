import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeUploadFolder, validateUploadBuffer } from "@/lib/upload-validation";

test("validates a real PNG signature", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(validateUploadBuffer(png, "image/png"), "image");
});

test("rejects spoofed image MIME types", () => {
  const html = Buffer.from("<script>alert(1)</script>");
  assert.throws(() => validateUploadBuffer(html, "image/png"), /Only JPEG/);
});

test("rejects SVG uploads", () => {
  const svg = Buffer.from("<svg><script>alert(1)</script></svg>");
  assert.throws(() => validateUploadBuffer(svg, "image/svg+xml"), /Only JPEG/);
});

test("sanitizes upload folders", () => {
  assert.equal(sanitizeUploadFolder(" /Tenant One//Hero Images! "), "tenant-one/hero-images-");
});
