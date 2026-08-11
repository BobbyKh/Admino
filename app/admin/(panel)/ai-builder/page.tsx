import { redirect } from "next/navigation";
import { requireAdmin, type Role } from "@/lib/auth";
import { checkTenantFeature } from "@/lib/tenant-features";
import { getAdminSiteId } from "@/lib/admin-site";
import { AiSiteBuilder } from "@/components/admin/ai-site-builder";

export const dynamic = "force-dynamic";

export default async function AiBuilderPage() {
  const user = await requireAdmin();
  const siteId = await getAdminSiteId();
  const denied = await checkTenantFeature(siteId, "ai_site_builder", {
    role: user.role as Role,
    userId: user.id,
  });
  if (denied) redirect("/admin");

  return <AiSiteBuilder />;
}
