"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth";
import { createDefaultHomepage } from "@/lib/default-homepage";
import { createDefaultNavigation } from "@/lib/default-navigation";
import { createEcommerceTemplate } from "@/lib/default-ecommerce";
import type { AdminActionState } from "./types";

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
