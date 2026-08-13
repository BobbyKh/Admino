"use server";

import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { promotions } from "@/lib/db/schema";
import { getCurrentSiteRequiringFeature } from "@/lib/tenant-access";
import { normalizePromotionCode } from "@/lib/commerce/totals";
import { requireRole } from "@/lib/auth";

const promotionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(2).max(40),
  status: z.enum(["draft", "active", "archived"]),
  type: z.enum(["percentage", "fixed", "free_shipping"]),
  value: z.coerce.number().min(0),
  minimumSubtotal: z.coerce.number().int().min(0),
  productIds: z.string().trim().max(1000).optional().default(""),
  categories: z.string().trim().max(1000).optional().default(""),
  startsAt: z.string().trim().optional().default(""),
  endsAt: z.string().trim().optional().default(""),
  usageLimit: z.string().trim().optional().default(""),
  perCustomerLimit: z.string().trim().optional().default(""),
  firstOrderOnly: z.boolean(),
});

async function siteId() { await requireRole("admin"); return getCurrentSiteRequiringFeature("commerce"); }
export async function listPromotions() { const id = await siteId(); return db.select().from(promotions).where(eq(promotions.siteId, id)).orderBy(asc(promotions.code)); }
export async function createPromotion(formData: FormData) { const id = await siteId(); const values = promotionInput(formData); await db.insert(promotions).values({ siteId: id, ...values }); revalidate(); }
export async function updatePromotion(promotionId: number, formData: FormData) { const id = await siteId(); const values = promotionInput(formData); await db.update(promotions).set({ ...values, updatedAt: new Date().toISOString() }).where(and(eq(promotions.id, promotionId), eq(promotions.siteId, id))); revalidate(); }
export async function deletePromotion(promotionId: number) { const id = await siteId(); await db.delete(promotions).where(and(eq(promotions.id, promotionId), eq(promotions.siteId, id))); revalidate(); }

function promotionInput(formData: FormData) {
  const input = promotionSchema.safeParse({ name: formData.get("name"), code: formData.get("code"), status: formData.get("status"), type: formData.get("type"), value: formData.get("value") ?? 0, minimumSubtotal: formData.get("minimumSubtotal") ?? 0, productIds: formData.get("productIds") ?? "", categories: formData.get("categories") ?? "", startsAt: formData.get("startsAt") ?? "", endsAt: formData.get("endsAt") ?? "", usageLimit: formData.get("usageLimit") ?? "", perCustomerLimit: formData.get("perCustomerLimit") ?? "", firstOrderOnly: formData.get("firstOrderOnly") === "on" });
  if (!input.success) throw new Error(input.error.issues[0]?.message ?? "Invalid promotion.");
  const value = input.data.type === "percentage" ? Math.round(input.data.value * 100) : Math.round(input.data.value);
  if (input.data.type === "percentage" && (value < 1 || value > 10_000)) throw new Error("Percentage discounts must be between 0.01 and 100.");
  if (input.data.type === "fixed" && value < 1) throw new Error("Fixed discounts must be at least 1 minor currency unit.");
  const startsAt = dateValue(input.data.startsAt);
  const endsAt = dateValue(input.data.endsAt);
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error("End time must be after start time.");
  return { name: input.data.name, code: normalizePromotionCode(input.data.code), status: input.data.status, type: input.data.type, value, minimumSubtotal: input.data.minimumSubtotal, productIds: numberList(input.data.productIds), categories: stringList(input.data.categories), startsAt, endsAt, usageLimit: optionalInteger(input.data.usageLimit), perCustomerLimit: optionalInteger(input.data.perCustomerLimit), firstOrderOnly: input.data.firstOrderOnly };
}

function numberList(value: string) { if (!value) return null; const items = [...new Set(value.split(",").map(Number).filter((item) => Number.isInteger(item) && item > 0))]; if (!items.length) throw new Error("Product IDs must be positive numbers separated by commas."); return JSON.stringify(items); }
function stringList(value: string) { const items = [...new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean))]; return items.length ? JSON.stringify(items) : null; }
function optionalInteger(value: string) { if (!value) return null; const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new Error("Usage limits must be positive whole numbers."); return parsed; }
function dateValue(value: string) { if (!value) return null; const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) throw new Error("Enter a valid date and time."); return parsed.toISOString(); }
function revalidate() { revalidatePath("/admin/commerce/promotions"); revalidatePath("/cart"); revalidatePath("/checkout"); }
