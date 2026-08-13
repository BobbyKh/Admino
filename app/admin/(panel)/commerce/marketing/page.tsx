import { MarketingManager } from "@/components/admin/marketing-manager";
import { getMarketingDashboard } from "@/lib/actions/index";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function MarketingPage() { await requireRole("admin"); return <MarketingManager data={await getMarketingDashboard()} />; }
