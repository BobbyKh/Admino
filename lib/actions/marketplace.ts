"use server";

import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { db } from "@/lib/db";
import { sellerApplications, sellerOrganizations, sellerStores } from "@/lib/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getResolvedSiteId } from "@/lib/site-context";
import { getCurrentSiteRequiringFeatureForRole, requireSiteFeatureForRole } from "@/lib/tenant-access";
import { getTenantFeatureAccess } from "@/lib/tenant-features";

const applicationSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  legalName: z.string().trim().max(160).optional(),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(6).max(40),
  country: z.string().trim().min(2).max(100),
  website: z.string().trim().url().max(300).optional(),
  taxId: z.string().trim().max(100).optional(),
  description: z.string().trim().min(30).max(2000),
});

export type SellerApplicationState = { success?: boolean; message?: string };

export async function isMarketplaceEnabled(siteId: number) {
  return (await getTenantFeatureAccess(siteId)).includes("marketplace");
}

export async function submitSellerApplication(_previous: SellerApplicationState, formData: FormData): Promise<SellerApplicationState> {
  const siteId = await getResolvedSiteId();
  if (!siteId || !(await isMarketplaceEnabled(siteId))) return { success: false, message: "Seller applications are not available for this site." };
  const input = applicationSchema.safeParse({
    businessName: formData.get("businessName"), legalName: formData.get("legalName") || undefined, contactName: formData.get("contactName"), email: formData.get("email"), phone: formData.get("phone"), country: formData.get("country"), website: formData.get("website") || undefined, taxId: formData.get("taxId") || undefined, description: formData.get("description"),
  });
  if (!input.success) return { success: false, message: input.error.issues[0]?.message ?? "Check the application details." };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (!(await checkRateLimit(`seller-application:${siteId}:${ip}`)).allowed) return { success: false, message: "Too many requests. Please try again shortly." };
  const email = input.data.email.toLowerCase();
  const [existing] = await db.select({ id: sellerApplications.id, status: sellerApplications.status }).from(sellerApplications).where(and(eq(sellerApplications.siteId, siteId), eq(sellerApplications.email, email)));
  if (existing) return { success: false, message: existing.status === "pending" ? "An application from this email is already under review." : "This email already has an application. Contact the marketplace team for help." };
  await db.insert(sellerApplications).values({ siteId, ...input.data, legalName: input.data.legalName || null, website: input.data.website || null, taxId: input.data.taxId || null, email });
  return { success: true, message: "Application received. The marketplace team will review it." };
}

export async function getMarketplaceDashboard() {
  const siteId = await getCurrentSiteRequiringFeatureForRole("marketplace", "admin");
  const [applications, sellers] = await Promise.all([
    db.select().from(sellerApplications).where(eq(sellerApplications.siteId, siteId)).orderBy(desc(sellerApplications.createdAt)),
    db.select({ id: sellerOrganizations.id, name: sellerOrganizations.name, contactEmail: sellerOrganizations.contactEmail, status: sellerOrganizations.status, verifiedAt: sellerOrganizations.verifiedAt, storeId: sellerStores.id, storeName: sellerStores.name, storeSlug: sellerStores.slug }).from(sellerOrganizations).leftJoin(sellerStores, eq(sellerStores.sellerId, sellerOrganizations.id)).where(eq(sellerOrganizations.siteId, siteId)).orderBy(desc(sellerOrganizations.createdAt)),
  ]);
  return { applications, sellers };
}

const reviewSchema = z.object({
  applicationId: z.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(1000).optional(),
});

export async function reviewSellerApplication(siteId: number, applicationId: number, decision: "approved" | "rejected", notes?: string) {
  const user = await requireSiteFeatureForRole(siteId, "marketplace", "admin");
  const input = reviewSchema.parse({ applicationId, decision, notes });
  const [application] = await db.select().from(sellerApplications).where(and(eq(sellerApplications.id, input.applicationId), eq(sellerApplications.siteId, siteId)));
  if (!application) throw new Error("Seller application not found.");
  if (application.status !== "pending") throw new Error("This application has already been reviewed.");
  if (input.decision === "rejected" && !input.notes) throw new Error("Add review notes before rejecting an application.");
  const now = new Date().toISOString();
  let sellerId: number | null = null;
  await db.transaction(async (tx) => {
    const updated = await tx.update(sellerApplications).set({ status: input.decision, reviewNotes: input.notes || null, reviewedBy: user.id, reviewedAt: now, updatedAt: now }).where(and(eq(sellerApplications.id, application.id), eq(sellerApplications.siteId, siteId), eq(sellerApplications.status, "pending"))).returning({ id: sellerApplications.id });
    if (!updated.length) throw new Error("This application has already been reviewed.");
    if (input.decision === "approved") {
      const [seller] = await tx.insert(sellerOrganizations).values({ siteId, applicationId: application.id, name: application.businessName, legalName: application.legalName, contactEmail: application.email, contactPhone: application.phone, country: application.country, taxId: application.taxId, verifiedAt: now, updatedAt: now }).returning({ id: sellerOrganizations.id });
      sellerId = seller.id;
      await tx.insert(sellerStores).values({ siteId, sellerId: seller.id, name: application.businessName, slug: `${slugify(application.businessName)}-${seller.id}`, description: application.description, updatedAt: now });
    }
  });
  await logActivity({ siteId, action: "status_change", entity: "seller_application", entityId: application.id, entityName: application.businessName, details: { from: "pending", to: input.decision, sellerId, notes: input.notes || null } });
  revalidatePath("/admin/commerce/sellers");
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "seller";
}
