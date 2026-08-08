import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("admin login applies database-backed rate limiting", () => {
  const file = source("app/admin/login/actions.ts");
  assert.match(file, /checkRateLimit/);
  assert.match(file, /`login:\${/);
});

test("page block updates create revision snapshots before mutation", () => {
  const file = source("lib/actions/pages.ts");
  assert.match(file, /await createPageRevision\(page\.id, "Before updating block", user\.id\)/);
  assert.match(file, /await createPageRevision\(page\.id, "Before deleting block", user\.id\)/);
  assert.match(file, /await createPageRevision\(page\.id, "Before reordering blocks", user\.id\)/);
});

test("password reset tokens expire in 30 minutes", () => {
  const file = source("app/admin/forgot-password/actions.ts");
  assert.match(file, /30 \* 60 \* 1000/);
});

test("eSewa payment route validates HMAC signatures before updating order status", () => {
  const file = source("app/api/payments/esewa/callback/route.ts");
  assert.match(file, /createHmac\("sha256", secrets\.secretKey\)/);
  assert.match(file, /timingSafeEqual/);
  assert.match(file, /status: "paid"/);
});
