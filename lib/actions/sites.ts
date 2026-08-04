"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
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

  if (!id || !name) return { message: "Site ID and name are required." };

  await db
    .update(sites)
    .set({ name, description, published, updatedAt: new Date().toISOString() })
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
