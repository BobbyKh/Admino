"use server";

import { createHash } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, sellerAccounts, sellerInvitations, sellerMembers, sellerOrganizations } from "@/lib/db/schema";
import { hashPassword } from "@/lib/password";
import { createSellerSession, destroySellerSession, requireSellerAction } from "@/lib/seller-auth";

export type SellerActionState = { error?: string };

export async function acceptSellerInvitation(_previous: SellerActionState, formData: FormData): Promise<SellerActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (!token) return { error: "Invitation token is missing." };
  if (password.length < 10) return { error: "Use at least 10 characters for your password." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };
  const [invitation] = await db.select().from(sellerInvitations).where(and(eq(sellerInvitations.tokenHash, hashToken(token)), isNull(sellerInvitations.acceptedAt)));
  if (!invitation || new Date(invitation.expiresAt).getTime() <= Date.now()) return { error: "This invitation is invalid or expired." };
  const [seller] = await db.select({ status: sellerOrganizations.status }).from(sellerOrganizations).where(and(eq(sellerOrganizations.id, invitation.sellerId), eq(sellerOrganizations.siteId, invitation.siteId)));
  if (!seller || seller.status !== "active") return { error: "This seller account is not active." };
  const passwordHash = await hashPassword(password);
  let accountId = 0;
  await db.transaction(async (tx) => {
    const consumed = await tx.update(sellerInvitations).set({ acceptedAt: new Date().toISOString() }).where(and(eq(sellerInvitations.id, invitation.id), isNull(sellerInvitations.acceptedAt))).returning({ id: sellerInvitations.id });
    if (!consumed.length) throw new Error("This invitation has already been accepted.");
    const [account] = await tx.insert(sellerAccounts).values({ siteId: invitation.siteId, name: invitation.name, email: invitation.email, passwordHash }).onConflictDoUpdate({ target: [sellerAccounts.siteId, sellerAccounts.email], set: { name: invitation.name, passwordHash, updatedAt: new Date().toISOString() } }).returning({ id: sellerAccounts.id });
    accountId = account.id;
    await tx.insert(sellerMembers).values({ siteId: invitation.siteId, sellerId: invitation.sellerId, accountId: account.id, role: invitation.role }).onConflictDoNothing({ target: [sellerMembers.sellerId, sellerMembers.accountId] });
  });
  await createSellerSession(accountId);
  redirect("/seller");
}

const productSchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(2000).optional().default(""),
  image: z.string().trim().url().optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().default(""),
  price: z.coerce.number().int().min(0),
  currency: z.string().trim().toLowerCase().length(3),
  inventoryQuantity: z.coerce.number().int().min(0),
  status: z.enum(["draft", "active", "archived"]),
});

function productInput(formData: FormData) {
  return productSchema.safeParse({ title: formData.get("title"), slug: formData.get("slug"), description: formData.get("description") ?? "", image: formData.get("image") ?? "", category: formData.get("category") ?? "", price: formData.get("price"), currency: formData.get("currency") ?? "usd", inventoryQuantity: formData.get("inventoryQuantity") ?? 0, status: formData.get("status") ?? "draft" });
}

export async function listSellerProducts() {
  const seller = await requireSellerAction();
  return db.select().from(products).where(and(eq(products.siteId, seller.siteId), eq(products.sellerId, seller.sellerId), eq(products.storeId, seller.storeId))).orderBy(desc(products.createdAt));
}

export async function createSellerProduct(formData: FormData) {
  const seller = await requireSellerAction();
  const parsed = productInput(formData);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid product.");
  const product = parsed.data;
  await db.insert(products).values({ ...product, siteId: seller.siteId, sellerId: seller.sellerId, storeId: seller.storeId, description: product.description || null, image: product.image || null, category: product.category || null, featured: false, updatedAt: new Date().toISOString() });
  revalidateSellerCatalog();
}

export async function updateSellerProduct(productId: number, formData: FormData) {
  const seller = await requireSellerAction();
  const parsed = productInput(formData);
  if (!Number.isInteger(productId) || productId < 1 || !parsed.success) throw new Error(parsed.success ? "Invalid product." : parsed.error.issues[0]?.message ?? "Invalid product.");
  const product = parsed.data;
  const updated = await db.update(products).set({ ...product, description: product.description || null, image: product.image || null, category: product.category || null, updatedAt: new Date().toISOString() }).where(and(eq(products.id, productId), eq(products.siteId, seller.siteId), eq(products.sellerId, seller.sellerId), eq(products.storeId, seller.storeId))).returning({ id: products.id });
  if (!updated.length) throw new Error("Product not found.");
  revalidateSellerCatalog();
}

export async function deleteSellerProduct(productId: number) {
  const seller = await requireSellerAction();
  if (!Number.isInteger(productId) || productId < 1) throw new Error("Invalid product.");
  const deleted = await db.delete(products).where(and(eq(products.id, productId), eq(products.siteId, seller.siteId), eq(products.sellerId, seller.sellerId), eq(products.storeId, seller.storeId))).returning({ id: products.id });
  if (!deleted.length) throw new Error("Product not found.");
  revalidateSellerCatalog();
}

export async function sellerLogout() {
  await destroySellerSession();
  redirect("/seller/login");
}

function revalidateSellerCatalog() {
  revalidatePath("/seller");
  revalidatePath("/seller/products");
  revalidatePath("/", "layout");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
