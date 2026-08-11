import assert from "node:assert/strict";
import { test } from "node:test";
import { buildThemeCss, sanitizeCssColor } from "../lib/theme-css";

test("buildThemeCss applies site colors to admin surfaces", () => {
  const css = buildThemeCss({
    themePrimary: "#123456",
    themeBackground: "#f8fafc",
    themeCard: "#ffffff",
    themeBorder: "#dbe2ea",
  });

  assert.match(css, /--primary: #123456;/);
  assert.match(css, /--sidebar-primary: #123456;/);
  assert.match(css, /--background: #f8fafc;/);
  assert.match(css, /--sidebar: #f8fafc;/);
  assert.match(css, /--popover: #ffffff;/);
  assert.match(css, /--input: #dbe2ea;/);
});

test("sanitizeCssColor rejects executable CSS values", () => {
  const fallback = "oklch(0.5 0.1 150)";
  assert.equal(sanitizeCssColor("url(javascript:alert(1))", fallback), fallback);
  assert.equal(sanitizeCssColor("#abcdef", fallback), "#abcdef");
});
