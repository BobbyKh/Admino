import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageBlocks, pages } from "@/lib/db/schema";
import { requireAdmin, type Role } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";

/** Returns the site currently authorized for the authenticated admin. */
export async function getCurrentAdminSiteId(): Promise<number> {
  await requireAdmin();
  return getAdminSiteId();
}

/** Verifies access to a site supplied by an untrusted client request. */
export async function requireSiteAccess(siteId: number) {
  const user = await requireAdmin();
  if ((user.role as Role) !== "super_admin" && user.siteId !== siteId) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requirePageAccess(pageId: number) {
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId));
  if (!page) throw new Error("Page not found");
  await requireSiteAccess(page.siteId);
  return page;
}

export async function requirePageBlockAccess(blockId: number) {
  const [block] = await db.select().from(pageBlocks).where(eq(pageBlocks.id, blockId));
  if (!block) throw new Error("Block not found");
  await requirePageAccess(block.pageId);
  return block;
}
