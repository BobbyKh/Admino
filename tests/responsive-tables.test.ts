import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("shared admin tables use contained horizontal scrolling", () => {
  const table = source("components/ui/table.tsx");
  assert.match(table, /overflow-x-auto overscroll-x-contain/);
  assert.match(table, /scrollbar-gutter:stable/);
});

test("orders use mobile cards and a bounded desktop table", () => {
  const orders = source("components/admin/orders-manager.tsx");
  assert.match(orders, /divide-y md:hidden/);
  assert.match(orders, /hidden md:block/);
  assert.match(orders, /min-w-\[1120px\] table-fixed/);
  assert.match(orders, /whitespace-normal/);
  assert.match(orders, /aria-label="Approve payment"/);
  assert.match(orders, /aria-label="Mark delivered"/);
});

test("every shared admin data table defines stable mobile geometry", () => {
  const tables: Array<[string, RegExp]> = [
    ["components/admin/product-manager.tsx", /min-w-\[680px\] table-fixed/],
    ["components/admin/blog-manager.tsx", /min-w-\[720px\] table-fixed/],
    ["components/admin/service-manager.tsx", /min-w-\[600px\] table-fixed/],
    ["components/admin/dashboard-bookings.tsx", /min-w-\[520px\] table-fixed/],
    ["app/admin/(panel)/bookings/page.tsx", /min-w-\[900px\] table-fixed/],
    ["app/admin/(panel)/users/page.tsx", /min-w-\[760px\] table-fixed/],
    ["app/admin/(panel)/activity/page.tsx", /min-w-\[720px\] table-fixed/],
  ];

  for (const [path, pattern] of tables) {
    assert.match(source(path), pattern, path);
  }
});

test("native admin tables keep overflow inside their cards", () => {
  const analytics = source("app/admin/(panel)/analytics/page-client.tsx");
  const billing = source("app/admin/(panel)/billing/page.tsx");
  const docs = source("components/admin/docs-hub.tsx");
  assert.match(analytics, /overflow-x-auto rounded-lg border overscroll-x-contain/);
  assert.match(analytics, /min-w-\[36rem\]/);
  assert.match(billing, /overflow-x-auto rounded-lg border overscroll-x-contain/);
  assert.match(billing, /min-w-\[32rem\]/);
  assert.match(docs, /overflow-x-auto rounded-lg border/);
  assert.match(docs, /min-w-\[36rem\]/);
});
