import "server-only";

import { and, count, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, promotionRedemptions, promotions, settings } from "@/lib/db/schema";
import type { Promotion } from "@/lib/db/schema";

export type TotalsItem = { productId: number; category: string | null; price: number; quantity: number };

export async function calculateCommerceTotals({ siteId, items, promotionCode, email, requireCustomerEligibility = false }: { siteId: number; items: TotalsItem[]; promotionCode?: string | null; email?: string | null; requireCustomerEligibility?: boolean }) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const rows = await db.select().from(settings).where(eq(settings.siteId, siteId));
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const shippingName = values.get("commerce_shipping_name") || "Standard delivery";
  const configuredShipping = nonNegativeInteger(values.get("commerce_shipping_price"));
  const taxRateBasisPoints = Math.round(nonNegativeNumber(values.get("commerce_tax_rate")) * 100);

  let promotion: Promotion | null = null;
  let discountAmount = 0;
  let shippingAmount = configuredShipping;
  let promotionError: string | null = null;

  if (promotionCode) {
    const code = normalizePromotionCode(promotionCode);
    [promotion] = await db.select().from(promotions).where(and(eq(promotions.siteId, siteId), eq(promotions.code, code)));
    promotionError = await validatePromotion(promotion, siteId, items, subtotal, email, requireCustomerEligibility);
    if (!promotionError && promotion) {
      const eligibleSubtotal = getEligibleSubtotal(items, promotion);
      if (promotion.type === "percentage") discountAmount = Math.min(eligibleSubtotal, Math.round(eligibleSubtotal * promotion.value / 10_000));
      if (promotion.type === "fixed") discountAmount = Math.min(eligibleSubtotal, promotion.value);
      if (promotion.type === "free_shipping") shippingAmount = 0;
    }
  }

  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableSubtotal * taxRateBasisPoints / 10_000);
  const total = taxableSubtotal + shippingAmount + taxAmount;
  return {
    subtotal,
    discountAmount,
    shippingAmount,
    shippingName,
    taxAmount,
    taxRateBasisPoints,
    total,
    promotion: promotion && !promotionError ? promotionSnapshot(promotion) : null,
    promotionError,
  };
}

async function validatePromotion(promotion: Promotion | null, siteId: number, items: TotalsItem[], subtotal: number, email?: string | null, requireCustomerEligibility = false) {
  if (!promotion || promotion.status !== "active") return "Invalid discount code.";
  const now = new Date().toISOString();
  if (promotion.startsAt && promotion.startsAt > now) return "This discount is not active yet.";
  if (promotion.endsAt && promotion.endsAt < now) return "This discount code has expired.";
  if (subtotal < promotion.minimumSubtotal) return `Spend at least ${promotion.minimumSubtotal} in minor currency units to use this code.`;
  if (getEligibleSubtotal(items, promotion) < 1) return "This discount does not apply to the products in your cart.";

  if (promotion.usageLimit) {
    const [{ value }] = await db.select({ value: count() }).from(promotionRedemptions).innerJoin(orders, eq(promotionRedemptions.orderId, orders.id)).where(and(eq(promotionRedemptions.promotionId, promotion.id), ne(orders.status, "cancelled")));
    if (value >= promotion.usageLimit) return "This discount code has reached its usage limit.";
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if ((promotion.perCustomerLimit || promotion.firstOrderOnly) && !normalizedEmail) {
    return requireCustomerEligibility ? "Enter your email to verify this discount code." : null;
  }
  if (normalizedEmail && promotion.perCustomerLimit) {
    const [{ value }] = await db.select({ value: count() }).from(promotionRedemptions).innerJoin(orders, eq(promotionRedemptions.orderId, orders.id)).where(and(eq(promotionRedemptions.siteId, siteId), eq(promotionRedemptions.promotionId, promotion.id), eq(promotionRedemptions.email, normalizedEmail), ne(orders.status, "cancelled")));
    if (value >= promotion.perCustomerLimit) return "You have already used this discount code.";
  }
  if (normalizedEmail && promotion.firstOrderOnly) {
    const [{ value }] = await db.select({ value: count() }).from(orders).where(and(eq(orders.siteId, siteId), eq(orders.email, normalizedEmail), ne(orders.status, "cancelled")));
    if (value > 0) return "This discount is only available on a first order.";
  }
  return null;
}

function getEligibleSubtotal(items: TotalsItem[], promotion: Promotion) {
  const productIds = parseNumberArray(promotion.productIds);
  const categories = parseStringArray(promotion.categories);
  const unrestricted = productIds.length === 0 && categories.length === 0;
  return items.reduce((sum, item) => unrestricted || productIds.includes(item.productId) || (item.category && categories.includes(item.category.toLowerCase())) ? sum + item.price * item.quantity : sum, 0);
}

export function normalizePromotionCode(value: string) { return value.trim().toUpperCase().replace(/\s+/g, ""); }
export function promotionSnapshot(promotion: Promotion) { return { id: promotion.id, name: promotion.name, code: promotion.code, type: promotion.type, value: promotion.value, minimumSubtotal: promotion.minimumSubtotal, productIds: parseNumberArray(promotion.productIds), categories: parseStringArray(promotion.categories) }; }
function parseNumberArray(raw: string | null) { try { const value = JSON.parse(raw ?? "[]") as unknown; return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : []; } catch { return []; } }
function parseStringArray(raw: string | null) { try { const value = JSON.parse(raw ?? "[]") as unknown; return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase()) : []; } catch { return []; } }
function nonNegativeInteger(value?: string) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0; }
function nonNegativeNumber(value?: string) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }
