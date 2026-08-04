import { requireRole } from "@/lib/auth";
import { getCommerceSettings } from "@/lib/actions/index";
import { CommerceManager } from "@/components/admin/commerce-manager";

export const dynamic = "force-dynamic";

export default async function CommercePage() {
  await requireRole("admin");
  const commerceSettings = await getCommerceSettings();

  return <CommerceManager commerceSettings={commerceSettings} />;
}
