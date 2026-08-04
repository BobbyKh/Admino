import { OrdersManager } from "@/components/admin/orders-manager";
import { listOrders } from "@/lib/actions/index";
import { requireRole } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function OrdersPage() { await requireRole("admin"); return <OrdersManager orders={await listOrders()} />; }
