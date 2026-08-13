import { SellerManager } from "@/components/admin/seller-manager";
import { getMarketplaceDashboard } from "@/lib/actions/marketplace";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SellersPage() {
  await requireRole("admin");
  const data = await getMarketplaceDashboard();
  return <SellerManager {...data} />;
}
