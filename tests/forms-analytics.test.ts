import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePageView, computeAnalyticsSummary, type PageViewEvent } from "../lib/analytics";

test("sanitizePageView validates siteId and path formatting", () => {
  const invalidSite = sanitizePageView({ siteId: 0, path: "/home" });
  assert.equal(invalidSite, null);

  const invalidPath = sanitizePageView({ siteId: 1, path: "home" });
  assert.equal(invalidPath, null);

  const valid = sanitizePageView({
    siteId: 5,
    path: "/products/shirt?color=blue",
    referrer: "<script>alert(1)</script>https://google.com",
  });

  assert.ok(valid !== null);
  assert.equal(valid?.siteId, 5);
  assert.equal(valid?.path, "/products/shirt?color=blue");
  assert.doesNotMatch(valid?.referrer ?? "", /<script>/);
});

test("computeAnalyticsSummary aggregates pageviews and top paths correctly", () => {
  const events: PageViewEvent[] = [
    { siteId: 1, path: "/", timestamp: "2026-08-08T10:00:00Z" },
    { siteId: 1, path: "/", timestamp: "2026-08-08T10:05:00Z" },
    { siteId: 1, path: "/products", timestamp: "2026-08-08T10:10:00Z" },
    { siteId: 1, path: "/contact", timestamp: "2026-08-08T10:15:00Z" },
  ];

  const summary = computeAnalyticsSummary(events);
  assert.equal(summary.totalViews, 4);
  assert.equal(summary.uniquePaths, 3);
  assert.equal(summary.topPaths[0].path, "/");
  assert.equal(summary.topPaths[0].views, 2);
});
