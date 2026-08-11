import { redirect } from "next/navigation";
import { requireAdmin, type Role } from "@/lib/auth";
import { checkTenantFeature } from "@/lib/tenant-features";
import { getAdminSiteId } from "@/lib/admin-site";
import { DemandForecastView } from "@/components/admin/demand-forecast";

export const dynamic = "force-dynamic";

export default async function AiForecastPage() {
  const user = await requireAdmin();
  const siteId = await getAdminSiteId();
  const denied = await checkTenantFeature(siteId, "ai_forecasting", {
    role: user.role as Role,
    userId: user.id,
  });
  if (denied) redirect("/admin");

  return <DemandForecastView />;
}
