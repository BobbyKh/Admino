import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

test("site selection uses a server-owned root cookie", () => {
  const action = source("lib/actions/sites.ts");
  const selector = source("components/admin/site-selector.tsx");
  assert.match(action, /cookieStore\.set\("admin_site_id", String\(siteId\)/);
  assert.match(action, /httpOnly: true/);
  assert.match(action, /path: "\/"/);
  assert.match(action, /requireSiteAccess\(siteId\)/);
  assert.match(selector, /selectAdminSite\(Number\(siteId\)\)/);
  assert.doesNotMatch(selector, /document\.cookie/);
});

test("Cloudinary operations require an explicit tenant", () => {
  const cloudinary = source("lib/cloudinary.ts");
  const uploadRoute = source("app/api/upload/route.ts");
  assert.match(cloudinary, /getCloudinaryConfig\(siteId: number\)/);
  assert.match(cloudinary, /buildTenantUploadFolder\(siteId, folder\)/);
  assert.match(uploadRoute, /uploadImageToCloudinary\(siteId, buffer, folder, resourceType\)/);
  assert.doesNotMatch(cloudinary, /cloudinary\.config/);
});

test("tenant email delivery carries an explicit site ID", () => {
  const email = source("lib/email.ts");
  assert.match(email, /sendMail\(siteId: number \| null/);
  assert.match(email, /getSmtpConfig\(message\.siteId\)/);
  assert.match(email, /sendMail\(order\.siteId/);
  assert.match(email, /sendMail\(booking\.siteId/);
  assert.match(email, /sendMail\(null, to, "Reset your Admino password"/);
});

test("production tenant resolution ignores preview overrides", () => {
  const proxy = source("proxy.ts");
  const context = source("lib/site-context.ts");
  assert.match(proxy, /requestHeaders\.delete\("x-site-slug"\)/);
  assert.match(proxy, /requestHeaders\.delete\("x-request-host"\)/);
  assert.match(context, /process\.env\.NODE_ENV !== "production" && siteSlug/);
});
