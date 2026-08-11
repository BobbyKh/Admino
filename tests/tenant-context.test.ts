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

test("super-admin uploads bind to the site displayed in the admin UI", () => {
  const route = source("app/api/upload/route.ts");
  const layout = source("app/admin/(panel)/layout.tsx");
  assert.match(layout, /AdminSiteProvider siteId=\{currentSiteId\}/);
  assert.match(route, /role === "super_admin"/);
  assert.match(route, /Number\(formData\.get\("siteId"\)\)/);
  assert.match(route, /requireSiteAccess\(selectedSiteId\)/);
  assert.match(route, /siteId = user\.siteId/);
  for (const path of [
    "components/admin/image-upload-field.tsx",
    "components/admin/media-library.tsx",
    "components/admin/video-picker.tsx",
    "app/admin/(panel)/media/page.tsx",
  ]) {
    assert.match(source(path), /formData\.append\("siteId", String\(siteId\)\)/, path);
  }
});

test("tenant email delivery carries an explicit site ID", () => {
  const email = source("lib/email.ts");
  assert.match(email, /sendMail\(siteId: number \| null/);
  assert.match(email, /getSmtpConfig\(message\.siteId\)/);
  assert.match(email, /sendMail\(order\.siteId/);
  assert.match(email, /sendMail\(booking\.siteId/);
  assert.match(email, /sendMail\(null, to, "Reset your Admino password"/);
});

test("production tenant previews require authorized admin access", () => {
  const proxy = source("proxy.ts");
  const context = source("lib/site-context.ts");
  const previewRoute = source("app/api/admin/site-preview/route.ts");
  const nav = source("components/admin/admin-nav.tsx");
  assert.match(proxy, /requestHeaders\.delete\("x-site-slug"\)/);
  assert.match(proxy, /requestHeaders\.delete\("x-request-host"\)/);
  assert.match(proxy, /SITE_SLUG_PATTERN\.test\(requestedSiteSlug\)/);
  assert.match(proxy, /requestHeaders\.set\("x-site-slug", siteSlug\)/);
  assert.match(proxy, /siteSlug && process\.env\.NODE_ENV === "development"/);
  assert.match(context, /await canCurrentAdminPreview\(previewSlug\)/);
  assert.match(context, /user\.role === "super_admin" \|\| user\.siteId === site\.id/);
  assert.match(context, /options\.allowProductionPreview/);
  assert.match(previewRoute, /requireSiteAccess\(siteId\)/);
  assert.match(previewRoute, /httpOnly: true/);
  assert.match(previewRoute, /response\.cookies\.set\("site_preview", site\.slug/);
  assert.match(nav, /\/api\/admin\/site-preview\?siteId=\$\{currentSite\.id\}/);
});

test("storefront APIs retain the authorized preview tenant", () => {
  for (const path of [
    "app/api/chat/route.ts",
    "app/api/payments/stripe/checkout/route.ts",
    "app/api/errors/log/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /getResolvedSite\(\)/, path);
    assert.doesNotMatch(route, /NODE_ENV === "development".*site/s, path);
  }
});

test("AI admin actions bind to the site displayed in the current tab", () => {
  const actionCallers: Array<[string, RegExp]> = [
    ["components/admin/ai-site-builder.tsx", /runAiSiteBuilder\(siteId,/],
    ["components/admin/ai-rag-manager.tsx", /reindexAiContent\(siteId\)/],
    ["components/admin/demand-forecast.tsx", /getDemandForecast\(siteId\)/],
    ["components/admin/settings-form.tsx", /generateThemeFromPrompt\(siteId, prompt\)/],
    ["components/admin/blog-manager.tsx", /generateBlogPostWithAi\(siteId, topic, aiTone\)/],
    ["components/admin/product-manager.tsx", /generateProductDescriptionWithAi\(siteId, title\)/],
  ];

  for (const [path, call] of actionCallers) {
    const file = source(path);
    assert.match(file, /useAdminSiteId\(\)/, path);
    assert.match(file, call, path);
  }

  for (const path of [
    "lib/actions/ai-builder.ts",
    "lib/actions/ai-rag.ts",
    "lib/actions/ai-forecast.ts",
    "lib/actions/theme-ai.ts",
    "lib/actions/blog-ai.ts",
    "lib/actions/product-ai.ts",
  ]) {
    const file = source(path);
    assert.match(file, /requireSiteFeatureForRole\(siteId,/, path);
    assert.doesNotMatch(file, /getCurrentAdminSiteId|getCurrentSiteRequiringFeature/, path);
  }
});

test("AI settings requests and related mutations use explicit tenant IDs", () => {
  const settingsAction = source("lib/actions/settings.ts");
  const settingsForm = source("components/admin/settings-form.tsx");
  const ragManager = source("components/admin/ai-rag-manager.tsx");
  assert.match(settingsAction, /updateSettings\(\s*siteId: number,/);
  assert.match(settingsAction, /requireSiteFeatureForRole\(siteId, "settings", "admin"\)/);
  assert.match(settingsForm, /updateSettings\.bind\(null, siteId\)/);
  assert.match(settingsForm, /JSON\.stringify\(\{ siteId, provider:/);
  assert.match(ragManager, /updateSettings\(siteId, \{\}, form\)/);

  for (const path of ["app/api/ai/models/route.ts", "app/api/ai/usage/route.ts"]) {
    const route = source(path);
    assert.match(route, /requireSiteFeatureForRole\(siteId, "settings", "admin"\)/, path);
    assert.doesNotMatch(route, /getCurrentSiteRequiringFeature/, path);
  }

  assert.match(source("components/admin/product-manager.tsx"), /createProduct\(siteId, formData\)/);
  assert.match(source("components/admin/blog-manager.tsx"), /createBlogPost\(siteId, formData\)/);
  assert.match(source("lib/actions/commerce.ts"), /createProduct\(siteId: number, formData: FormData\)/);
  assert.match(source("lib/actions/blog.ts"), /createBlogPost\(siteId: number, formData: FormData\)/);
});

test("admin shell shows and themes the active site", () => {
  const layout = source("app/admin/(panel)/layout.tsx");
  const nav = source("components/admin/admin-nav.tsx");
  assert.match(layout, /getSiteSettings\(currentSiteId\)/);
  assert.match(layout, /buildThemeCss\(brandSettings\)/);
  assert.match(layout, /currentSite\?\.name \?\? brandSettings\.siteName/);
  assert.match(layout, /<SiteSelector sites=\{sites\} currentSiteId=\{currentSiteId\} compact/);
  assert.match(nav, /currentSite\?\.name \?\? "Active site"/);
});
