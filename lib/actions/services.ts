"use server";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { serviceCategories, services } from "@/lib/db/schema";
import { getCurrentSiteRequiringFeature } from "@/lib/tenant-access";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
});

const serviceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  image: z.string().trim().url().optional().or(z.literal("")),
  categoryId: z.coerce.number().int().positive().nullable(),
  featured: z.boolean(),
  active: z.boolean(),
});

async function getServiceSiteId() {
  await requireRole("admin");
  return getCurrentSiteRequiringFeature("services");
}

function revalidateServices() {
  revalidatePath("/admin/services");
  revalidatePath("/", "layout");
}

export async function listServiceCatalog() {
  const siteId = await getServiceSiteId();
  const [categories, serviceList] = await Promise.all([
    db.select().from(serviceCategories).where(eq(serviceCategories.siteId, siteId)).orderBy(asc(serviceCategories.sortOrder), asc(serviceCategories.name)),
    db.select().from(services).where(eq(services.siteId, siteId)).orderBy(desc(services.featured), desc(services.createdAt)),
  ]);
  return { categories, services: serviceList };
}

export async function createServiceCategory(formData: FormData) {
  const siteId = await getServiceSiteId();
  const parsed = categorySchema.safeParse({ name: formData.get("name"), slug: formData.get("slug") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid category.");
  const [{ value: maxSort }] = await db.select({ value: sql<number>`coalesce(max(${serviceCategories.sortOrder}), -1)` }).from(serviceCategories).where(eq(serviceCategories.siteId, siteId));
  await db.insert(serviceCategories).values({ siteId, ...parsed.data, sortOrder: maxSort + 1 });
  revalidateServices();
}

export async function deleteServiceCategory(categoryId: number) {
  const siteId = await getServiceSiteId();
  await db.delete(serviceCategories).where(and(eq(serviceCategories.id, categoryId), eq(serviceCategories.siteId, siteId)));
  revalidateServices();
}

function serviceInput(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "");
  return serviceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    image: formData.get("image") ?? "",
    categoryId: categoryId ? Number(categoryId) : null,
    featured: formData.get("featured") === "on",
    active: formData.get("active") === "on",
  });
}

async function validateCategory(siteId: number, categoryId: number | null) {
  if (!categoryId) return;
  const [category] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(and(eq(serviceCategories.id, categoryId), eq(serviceCategories.siteId, siteId)));
  if (!category) throw new Error("Invalid service category.");
}

export async function createService(formData: FormData) {
  const siteId = await getServiceSiteId();
  const parsed = serviceInput(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid service.");
  const service = parsed.data;
  await validateCategory(siteId, service.categoryId);
  const [{ value: maxSort }] = await db.select({ value: sql<number>`coalesce(max(${services.sortOrder}), -1)` }).from(services).where(eq(services.siteId, siteId));
  await db.insert(services).values({ siteId, ...service, description: service.description || null, image: service.image || null, sortOrder: maxSort + 1, updatedAt: new Date().toISOString() });
  revalidateServices();
}

export async function updateService(serviceId: number, formData: FormData) {
  const siteId = await getServiceSiteId();
  const parsed = serviceInput(formData);
  if (!Number.isInteger(serviceId) || serviceId < 1) throw new Error("Invalid service.");
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid service.");
  const service = parsed.data;
  await validateCategory(siteId, service.categoryId);
  await db.update(services).set({ ...service, description: service.description || null, image: service.image || null, updatedAt: new Date().toISOString() }).where(and(eq(services.id, serviceId), eq(services.siteId, siteId)));
  revalidateServices();
}

export async function deleteService(serviceId: number) {
  const siteId = await getServiceSiteId();
  await db.delete(services).where(and(eq(services.id, serviceId), eq(services.siteId, siteId)));
  revalidateServices();
}
