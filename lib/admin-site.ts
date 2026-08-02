import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { getSessionUser, type Role } from "@/lib/auth";

/**
 * Returns the siteId selected in the admin panel (stored in cookie).
 * Falls back to the user's assigned site, then to the first site.
 * Always returns a valid siteId if sites exist; throws if no sites.
 */
export async function getAdminSiteId(): Promise<number> {
  const user = await getSessionUser();

  // If user is logged in and is super_admin, check cookie
  if (user) {
    const userRole = (user.role as Role) ?? "viewer";

    if (userRole === "super_admin") {
      const cookieStore = await cookies();
      const siteIdCookie = cookieStore.get("admin_site_id")?.value;
      if (siteIdCookie) {
        const id = Number(siteIdCookie);
        if (!isNaN(id) && id > 0) {
          const [site] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, id));
          if (site) return site.id;
        }
      }
    }

    // Non-super-admins: use their assigned siteId
    if (user.siteId) {
      return user.siteId;
    }
  }

  // Fallback: first site (always return a valid site if one exists)
  const [first] = await db.select({ id: sites.id }).from(sites).orderBy(sites.id);
  if (!first) throw new Error("No sites exist. Create a site first.");
  return first.id;
}

/** Returns all sites the current user has access to. */
export async function getAllAdminSites() {
  const user = await getSessionUser();
  if (!user) return [];

  const userRole = (user.role as Role) ?? "viewer";

  // Super admins see all sites
  if (userRole === "super_admin") {
    return db.select({ id: sites.id, name: sites.name, slug: sites.slug }).from(sites).orderBy(sites.id);
  }

  // Other roles: only their assigned site
  if (user.siteId) {
    const [site] = await db
      .select({ id: sites.id, name: sites.name, slug: sites.slug })
      .from(sites)
      .where(eq(sites.id, user.siteId));
    return site ? [site] : [];
  }

  return [];
}
