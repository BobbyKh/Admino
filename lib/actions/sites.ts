"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { navLinks, pages, paymentConfigurations, products, settings, sites } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { createDefaultHomepage } from "@/lib/default-homepage";
import { createDefaultNavigation } from "@/lib/default-navigation";
import { createEcommerceTemplate } from "@/lib/default-ecommerce";
import type { AdminActionState } from "./types";
import { getTenantFeatureAccess, setTenantFeatureAccess, TENANT_FEATURES, type TenantFeature } from "@/lib/tenant-features";

function getPlatformDomain() {
  const domain = process.env.PLATFORM_DOMAIN?.trim().toLowerCase();
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function normalizeDomain(value: FormDataEntryValue | null) {
  const domain = String(value ?? "").trim().toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
  if (!domain) return null;
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain)) {
    throw new Error("Enter a valid domain, for example www.example.com.");
  }
  return domain;
}

export async function createSite(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = `site-${Date.now()}`;
  const template = String(formData.get("template") ?? "blank").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const platformDomain = getPlatformDomain();

  if (!name) return { message: "Site name is required." };

  const [site] = await db
    .insert(sites)
    .values({
      name,
      slug,
      template,
      description,
      domain: platformDomain ? `${slug}.${platformDomain}` : null,
      published: false,
    })
    .returning({ id: sites.id });
  if (template === "ecommerce") {
    await createEcommerceTemplate(site.id, name);
  } else {
    await createDefaultHomepage(site.id);
    await createDefaultNavigation(site.id);
  }
  revalidatePath("/admin/sites");
  revalidatePath("/", "layout");
  return { success: true, message: "Site created." };
}

export async function updateSite(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireRole("super_admin");
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const published = formData.get("published") === "on";
  const customDomain = normalizeDomain(formData.get("domain"));
  const enabledFeatures = TENANT_FEATURES.filter((feature) => formData.get(`feature_${feature}`) === "on");

  if (!id || !name) return { message: "Site ID and name are required." };

  const [currentSite] = await db.select({ slug: sites.slug }).from(sites).where(eq(sites.id, id));
  if (!currentSite) return { message: "Site not found." };
  const domain = customDomain ?? (getPlatformDomain() ? `${currentSite.slug}.${getPlatformDomain()}` : null);

  if (domain) {
    const [existingDomain] = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.domain, domain), ne(sites.id, id)));
    if (existingDomain) return { message: "This domain is already assigned to another site." };
  }

  await db
    .update(sites)
    .set({ name, description, domain, published, updatedAt: new Date().toISOString() })
    .where(eq(sites.id, id));
  await setTenantFeatureAccess(id, enabledFeatures);
  revalidatePath("/admin/sites");
  return { success: true, message: "Site updated." };
}

export async function deleteSite(id: number) {
  await requireRole("super_admin");
  await db.delete(sites).where(eq(sites.id, id));
  revalidatePath("/admin/sites");
}

export async function getSites() {
  await requireRole("super_admin");
  return db.select().from(sites);
}

export async function getAllTenantFeatureAccess() {
  await requireRole("super_admin");
  const allSites = await db.select({ id: sites.id }).from(sites);
  const access = await Promise.all(allSites.map(async (site) => ({ siteId: site.id, features: await getTenantFeatureAccess(site.id) })));
  return Object.fromEntries(access.map(({ siteId, features }) => [siteId, features])) as Record<number, TenantFeature[]>;
}

export type SitePublishReadiness = {
  complete: number;
  total: number;
  checks: Array<{ key: string; label: string; complete: boolean; helper: string }>;
};

export async function getSitePublishReadiness(): Promise<Record<number, SitePublishReadiness>> {
  await requireRole("super_admin");
  const allSites = await db.select().from(sites);
  const entries = await Promise.all(allSites.map(async (site) => {
    const [siteSettings, sitePages, siteNavLinks, activeProducts, enabledPayments, features] = await Promise.all([
      db.select({ key: settings.key, value: settings.value }).from(settings).where(eq(settings.siteId, site.id)),
      db.select({ slug: pages.slug, published: pages.published }).from(pages).where(eq(pages.siteId, site.id)),
      db.select({ id: navLinks.id }).from(navLinks).where(and(eq(navLinks.siteId, site.id), eq(navLinks.visible, true))),
      db.select({ id: products.id }).from(products).where(and(eq(products.siteId, site.id), eq(products.status, "active"))),
      db.select({ id: paymentConfigurations.id }).from(paymentConfigurations).where(and(eq(paymentConfigurations.siteId, site.id), eq(paymentConfigurations.enabled, true))),
      getTenantFeatureAccess(site.id),
    ]);
    const settingMap = new Map(siteSettings.map((row) => [row.key, row.value.trim()]));
    const hasCommerce = site.template === "ecommerce" || features.includes("commerce");
    const checks = [
      { key: "identity", label: "Site identity", complete: Boolean(site.name.trim() && (site.description?.trim() || settingMap.get("description"))), helper: "Add a clear site name and description." },
      { key: "contact", label: "Contact details", complete: Boolean(settingMap.get("email") && settingMap.get("phone") && settingMap.get("address")), helper: "Add email, phone, and address in Settings." },
      { key: "homepage", label: "Published homepage", complete: sitePages.some((page) => page.slug === "home" && page.published), helper: "Publish the home page before launch." },
      { key: "pages", label: "Published pages", complete: sitePages.some((page) => page.published), helper: "Publish at least one public page." },
      { key: "navigation", label: "Visible navigation", complete: siteNavLinks.length > 0, helper: "Add at least one visible navigation link." },
      { key: "domain", label: "Custom domain", complete: Boolean(site.domain), helper: "Connect a custom domain or use the preview URL intentionally." },
      ...(hasCommerce ? [
        { key: "products", label: "Active products", complete: activeProducts.length > 0, helper: "Add active products before enabling commerce." },
        { key: "payments", label: "Payment method", complete: enabledPayments.length > 0, helper: "Enable at least one manual/test payment method." },
      ] : []),
    ];
    return [site.id, { complete: checks.filter((check) => check.complete).length, total: checks.length, checks }] as const;
  }));
  return Object.fromEntries(entries);
}
