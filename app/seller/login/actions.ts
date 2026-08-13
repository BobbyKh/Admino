"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSellerSession, verifySellerCredentials } from "@/lib/seller-auth";
import { getResolvedSiteId } from "@/lib/site-context";
import { getTenantFeatureAccess } from "@/lib/tenant-features";

export type SellerLoginState = { error?: string };

export async function sellerLogin(_previous: SellerLoginState, formData: FormData): Promise<SellerLoginState> {
  const siteId = await getResolvedSiteId();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!siteId || !(await getTenantFeatureAccess(siteId)).includes("marketplace")) return { error: "Seller access is unavailable for this site." };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (!(await checkRateLimit(`seller-login:${siteId}:${ip}:${email || "unknown"}`)).allowed) return { error: "Too many login attempts. Try again in a minute." };
  const account = await verifySellerCredentials(siteId, email, password);
  if (!account) return { error: "Invalid email or password." };
  await createSellerSession(account.id);
  redirect("/seller");
}
