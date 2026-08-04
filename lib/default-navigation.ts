import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { navLinks } from "@/lib/db/schema-postgres";

/** Creates an editable, tenant-owned navigation menu when one does not exist. */
export async function createDefaultNavigation(siteId: number, template?: string) {
  const [existingLink] = await db
    .select({ id: navLinks.id })
    .from(navLinks)
    .where(eq(navLinks.siteId, siteId));
  if (existingLink) return;

  const links = template === "ecommerce"
    ? [
        { siteId, label: "Home", href: "/", sortOrder: 0, visible: true, external: false },
        { siteId, label: "Shop", href: "/#shop", sortOrder: 1, visible: true, external: false },
        { siteId, label: "Contact", href: "/contact", sortOrder: 2, visible: true, external: false },
      ]
    : [
        { siteId, label: "Home", href: "/", sortOrder: 0, visible: true, external: false },
        { siteId, label: "Contact", href: "/contact", sortOrder: 1, visible: true, external: false },
      ];
  await db.insert(navLinks).values(links);
}
