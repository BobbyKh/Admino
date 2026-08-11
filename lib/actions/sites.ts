"use server";

import { resolve4, resolveCname } from "node:dns/promises";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { navLinks, pageBlocks, pages, paymentConfigurations, products, settings, sites } from "@/lib/db/schema";
import { requireActionRole, requireRole } from "@/lib/auth";
import { requireSiteAccess } from "@/lib/tenant-access";
import { createDefaultHomepage } from "@/lib/default-homepage";
import { createDefaultNavigation } from "@/lib/default-navigation";
import { createEcommerceTemplate } from "@/lib/default-ecommerce";
import { getTemplatePreset } from "@/lib/templates";
import type { AdminActionState } from "./types";
import { getTenantFeatureAccess, setTenantFeatureAccess, TENANT_FEATURES, type TenantFeature } from "@/lib/tenant-features";

function getPlatformDomain() {
  const domain = process.env.PLATFORM_DOMAIN?.trim().toLowerCase();
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function getExpectedCnameTarget() {
  return (process.env.DOMAIN_CNAME_TARGET || "cname.vercel-dns.com").trim().toLowerCase().replace(/\.$/, "");
}

export async function selectAdminSite(siteId: number) {
  await requireActionRole("viewer");
  if (!Number.isInteger(siteId) || siteId < 1) return { success: false, message: "Invalid site." };
  await requireSiteAccess(siteId);
  const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, siteId));
  if (!site) return { success: false, message: "Site not found." };

  const cookieStore = await cookies();
  cookieStore.set("admin_site_id", "", { path: "/admin", maxAge: 0 });
  cookieStore.set("admin_site_id", String(siteId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/admin", "layout");
  return { success: true };
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

export async function onboardSite(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState & { data?: { siteId?: number } }> {
  await requireRole("super_admin");
  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) slug = `site-${Date.now()}`;
  const template = String(formData.get("template") ?? "blank").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  let customDomain: string | null;
  try { customDomain = normalizeDomain(formData.get("domain")); } catch (error) { return { message: error instanceof Error ? error.message : "Invalid domain." }; }
  const domain = customDomain ?? (getPlatformDomain() ? `${slug}.${getPlatformDomain()}` : null);
  if (!name) return { message: "Site name is required." };

  const [existing] = await db.select({ id: sites.id }).from(sites).where(eq(sites.slug, slug));
  if (existing) return { message: "A site with this slug already exists." };

  const [site] = await db.insert(sites).values({
    name,
    slug,
    template,
    description,
    domain,
    domainStatus: domain ? "pending_dns" : "not_configured",
    domainError: domain ? "Domain has not been verified yet." : null,
    published: false,
  }).returning({ id: sites.id });

  const now = new Date().toISOString();
  const settingValues: Record<string, string> = {
    siteName: name,
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: description ?? "",
    logo: String(formData.get("logo") ?? "").trim(),
    favicon: String(formData.get("favicon") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    adminNotifyEmail: String(formData.get("adminNotifyEmail") ?? formData.get("email") ?? "").trim(),
  };
  for (const [key, value] of Object.entries(settingValues)) {
    await db.insert(settings).values({ siteId: site.id, key, value, updatedAt: now }).onConflictDoUpdate({ target: [settings.key, settings.siteId], set: { value, updatedAt: now } });
  }

  if (template === "ecommerce") await createEcommerceTemplate(site.id, name);
  else {
    await createDefaultHomepage(site.id);
    await createDefaultNavigation(site.id, template);
  }

  const enabledFeatures = TENANT_FEATURES.filter((feature) => formData.get(`feature_${feature}`) === "on");
  await setTenantFeatureAccess(site.id, enabledFeatures.length ? enabledFeatures : TENANT_FEATURES.filter((feature) => !feature.startsWith("ai_")));
  revalidatePath("/admin/sites");
  revalidatePath("/admin/onboarding");
  return { success: true, message: "Site onboarded.", data: { siteId: site.id } };
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

  const [currentSite] = await db.select({ slug: sites.slug, domain: sites.domain, domainStatus: sites.domainStatus, domainVerifiedAt: sites.domainVerifiedAt }).from(sites).where(eq(sites.id, id));
  if (!currentSite) return { message: "Site not found." };
  const domain = customDomain ?? (getPlatformDomain() ? `${currentSite.slug}.${getPlatformDomain()}` : null);
  const domainChanged = domain !== currentSite.domain;

  if (domain) {
    const [existingDomain] = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.domain, domain), ne(sites.id, id)));
    if (existingDomain) return { message: "This domain is already assigned to another site." };
  }

  await db
    .update(sites)
    .set({
      name,
      description,
      domain,
      domainStatus: domainChanged ? (domain ? "pending_dns" : "not_configured") : currentSite.domainStatus,
      domainVerifiedAt: domainChanged ? null : currentSite.domainVerifiedAt,
      domainLastCheckedAt: domainChanged && domain ? new Date().toISOString() : undefined,
      domainError: domainChanged ? (domain ? "Domain has not been verified yet." : null) : undefined,
      published,
      updatedAt: new Date().toISOString(),
    })
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

export async function checkSiteDomain(siteId: number) {
  await requireRole("super_admin");
  if (!Number.isInteger(siteId) || siteId < 1) throw new Error("Invalid site.");
  const [site] = await db.select({ id: sites.id, domain: sites.domain }).from(sites).where(eq(sites.id, siteId));
  if (!site) throw new Error("Site not found.");
  if (!site.domain) {
    await updateDomainStatus(site.id, "not_configured", "Add a custom domain before checking DNS.");
    return { status: "not_configured", message: "Add a custom domain before checking DNS." };
  }

  const domain = site.domain.toLowerCase();
  const expectedCname = getExpectedCnameTarget();
  try {
    const cnames = await resolveCname(domain).catch(() => []);
    const normalizedCnames = cnames.map((entry) => entry.toLowerCase().replace(/\.$/, ""));
    const cnameOk = normalizedCnames.some((entry) => entry === expectedCname || entry.endsWith(`.${expectedCname}`));
    if (cnameOk) {
      await updateDomainStatus(site.id, "verified", null);
      return { status: "verified", message: "Domain CNAME is verified." };
    }

    const addresses = await resolve4(domain).catch(() => []);
    if (addresses.length > 0 && process.env.DOMAIN_A_RECORDS) {
      const expectedAddresses = process.env.DOMAIN_A_RECORDS.split(",").map((entry) => entry.trim()).filter(Boolean);
      if (addresses.some((address) => expectedAddresses.includes(address))) {
        await updateDomainStatus(site.id, "verified", null);
        return { status: "verified", message: "Domain A record is verified." };
      }
    }

    const message = normalizedCnames.length > 0
      ? `Expected CNAME ${expectedCname}, found ${normalizedCnames.join(", ")}.`
      : "No matching CNAME record found.";
    await updateDomainStatus(site.id, "error", message);
    return { status: "error", message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to check DNS.";
    await updateDomainStatus(site.id, "error", message);
    return { status: "error", message };
  }
}

async function updateDomainStatus(siteId: number, status: "not_configured" | "pending_dns" | "verified" | "error", error: string | null) {
  const now = new Date().toISOString();
  await db.update(sites).set({
    domainStatus: status,
    domainVerifiedAt: status === "verified" ? now : null,
    domainLastCheckedAt: now,
    domainError: error,
    updatedAt: now,
  }).where(eq(sites.id, siteId));
  revalidatePath("/admin/sites");
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
      { key: "domain", label: "Verified custom domain", complete: Boolean(site.domain && site.domainStatus === "verified"), helper: "Connect and verify a custom domain, or use the preview URL intentionally." },
      ...(hasCommerce ? [
        { key: "products", label: "Active products", complete: activeProducts.length > 0, helper: "Add active products before enabling commerce." },
        { key: "payments", label: "Payment method", complete: enabledPayments.length > 0, helper: "Enable at least one manual/test payment method." },
      ] : []),
    ];
    return [site.id, { complete: checks.filter((check) => check.complete).length, total: checks.length, checks }] as const;
  }));
  return Object.fromEntries(entries);
}

export async function applyTemplatePreset(siteId: number, templateId: string) {
  await requireRole("super_admin");
  const preset = getTemplatePreset(templateId);

  await db.transaction(async (tx) => {
    await tx.update(sites).set({ template: preset.id, updatedAt: new Date().toISOString() }).where(eq(sites.id, siteId));

    for (const pageDef of preset.defaultPages) {
      const [existingPage] = await tx.select({ id: pages.id }).from(pages).where(and(eq(pages.siteId, siteId), eq(pages.slug, pageDef.slug)));

      let pageId = existingPage?.id;
      if (!pageId) {
        const [newPage] = await tx.insert(pages).values({
          siteId,
          title: pageDef.title,
          slug: pageDef.slug,
          published: true,
          updatedAt: new Date().toISOString(),
        }).returning({ id: pages.id });
        pageId = newPage.id;
      }

      for (let i = 0; i < pageDef.blocks.length; i++) {
        const b = pageDef.blocks[i];
        await tx.insert(pageBlocks).values({
          pageId,
          type: b.type,
          title: b.title,
          sortOrder: i,
          visible: true,
          config: JSON.stringify(b.config),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  revalidatePath("/admin/sites");
  revalidatePath("/", "layout");
  return { success: true, message: `Applied ${preset.name} template.` };
}
