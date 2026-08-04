import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { navLinks } from "@/lib/db/schema-postgres";

/** Creates an editable, tenant-owned navigation menu when one does not exist. */
export async function createDefaultNavigation(siteId: number) {
  const [existingLink] = await db
    .select({ id: navLinks.id })
    .from(navLinks)
    .where(eq(navLinks.siteId, siteId));
  if (existingLink) return;

  await db.insert(navLinks).values([
    { siteId, label: "Home", href: "/", sortOrder: 0, visible: true, external: false },
    { siteId, label: "Contact", href: "/contact", sortOrder: 1, visible: true, external: false },
  ]);
}
