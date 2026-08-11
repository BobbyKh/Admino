import { redirect } from "next/navigation";
import { requireAdmin, type Role } from "@/lib/auth";
import { checkTenantFeature } from "@/lib/tenant-features";
import { getAdminSiteId } from "@/lib/admin-site";
import { AiSiteAuditor } from "@/components/admin/ai-site-auditor";

export const dynamic = "force-dynamic";

export default async function AiAuditorPage() {
  const user = await requireAdmin();
  const siteId = await getAdminSiteId();
  const denied = await checkTenantFeature(siteId, "ai_site_auditor", {
    role: user.role as Role,
    userId: user.id,
  });
  if (denied) redirect("/admin");

  return <AiSiteAuditor siteId={siteId} />;
}
