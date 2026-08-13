import { PromotionManager } from "@/components/admin/promotion-manager";
import { listPromotions } from "@/lib/actions/index";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function PromotionsPage() { await requireRole("admin"); return <PromotionManager promotions={await listPromotions()} />; }
