import { getAdminSiteId } from "@/lib/admin-site";
import { AnalyticsPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const siteId = await getAdminSiteId();
  return <AnalyticsPageClient siteId={siteId} />;
}
