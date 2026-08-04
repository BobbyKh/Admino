import { LayoutManager } from "@/components/admin/layout-manager";
import { getAdminSiteId } from "@/lib/admin-site";
import { getLayoutSettings } from "@/lib/layout-settings";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export default async function LayoutPage() { await requireRole("admin"); const siteId = await getAdminSiteId(); const [initial, site] = await Promise.all([getLayoutSettings(siteId), db.select({ template: sites.template }).from(sites).where(eq(sites.id, siteId)).then((rows) => rows[0])]); return <LayoutManager initial={initial} ecommerce={site?.template === "ecommerce"} />; }
