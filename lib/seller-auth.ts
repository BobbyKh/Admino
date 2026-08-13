import "server-only";

import { and, eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sellerAccounts, sellerMembers, sellerOrganizations, sellerStores } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/password";
import { getResolvedSiteId } from "@/lib/site-context";
import { getTenantFeatureAccess } from "@/lib/tenant-features";

export const SELLER_SESSION_COOKIE = "admino_seller_session";
const SELLER_SESSION_AUDIENCE = "admino-seller";

function getAuthSecret() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET environment variable is required.");
  return new TextEncoder().encode(process.env.AUTH_SECRET);
}

export async function createSellerSession(accountId: number) {
  const token = await new SignJWT({ sub: String(accountId) })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(SELLER_SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
  const cookieStore = await cookies();
  cookieStore.set(SELLER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/seller",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySellerSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SELLER_SESSION_COOKIE);
}

export async function getSellerSessionAccountId() {
  const token = (await cookies()).get(SELLER_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), { audience: SELLER_SESSION_AUDIENCE });
    const accountId = Number(payload.sub);
    return Number.isInteger(accountId) && accountId > 0 ? accountId : null;
  } catch {
    return null;
  }
}

export async function getSellerContext() {
  const [accountId, siteId] = await Promise.all([getSellerSessionAccountId(), getResolvedSiteId()]);
  if (!accountId || !siteId || !(await getTenantFeatureAccess(siteId)).includes("marketplace")) return null;
  const [context] = await db.select({
    accountId: sellerAccounts.id,
    name: sellerAccounts.name,
    email: sellerAccounts.email,
    siteId: sellerMembers.siteId,
    sellerId: sellerMembers.sellerId,
    role: sellerMembers.role,
    sellerName: sellerOrganizations.name,
    sellerStatus: sellerOrganizations.status,
    storeId: sellerStores.id,
    storeName: sellerStores.name,
    storeStatus: sellerStores.status,
  }).from(sellerMembers)
    .innerJoin(sellerAccounts, eq(sellerAccounts.id, sellerMembers.accountId))
    .innerJoin(sellerOrganizations, eq(sellerOrganizations.id, sellerMembers.sellerId))
    .innerJoin(sellerStores, eq(sellerStores.sellerId, sellerOrganizations.id))
    .where(and(eq(sellerMembers.accountId, accountId), eq(sellerMembers.siteId, siteId), eq(sellerOrganizations.siteId, siteId), eq(sellerStores.siteId, siteId)));
  if (!context || context.sellerStatus !== "active" || context.storeStatus !== "active") return null;
  return context;
}

export async function requireSeller() {
  const context = await getSellerContext();
  if (!context) redirect("/seller/login");
  return context;
}

export async function requireSellerAction() {
  const context = await getSellerContext();
  if (!context) throw new Error("Forbidden");
  return context;
}

export async function verifySellerCredentials(siteId: number, email: string, password: string) {
  const [account] = await db.select().from(sellerAccounts).where(and(eq(sellerAccounts.siteId, siteId), eq(sellerAccounts.email, email.toLowerCase())));
  if (!account || !(await verifyPassword(password, account.passwordHash))) return null;
  return account;
}
