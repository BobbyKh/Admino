import assert from "node:assert/strict";
import { test } from "node:test";
import { validateBlockConfig } from "@/lib/block-config-validation";

test("accepts known block config field types", () => {
  const config = validateBlockConfig("hero", JSON.stringify({ title: "Launch", ctaPrimaryLink: "/contact" }));
  assert.equal(config, JSON.stringify({ title: "Launch", ctaPrimaryLink: "/contact" }));
});

test("rejects unsafe JSON keys", () => {
  assert.throws(() => validateBlockConfig("hero", '{"__proto__":{"polluted":true}}'), /unsafe key/);
});

test("rejects invalid known field types", () => {
  assert.throws(() => validateBlockConfig("hero", JSON.stringify({ title: 42 })), /Invalid value/);
});
