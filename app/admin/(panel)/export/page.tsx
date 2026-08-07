import { requireRole } from "@/lib/auth";
import { getAdminSiteId, getAllAdminSites } from "@/lib/admin-site";
import { ExportManager } from "./export-manager";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  await requireRole("admin");
  const [sites, currentSiteId] = await Promise.all([getAllAdminSites(), getAdminSiteId()]);
  return <ExportManager sites={sites} currentSiteId={currentSiteId} />;
}
