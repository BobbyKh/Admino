import { ServiceManager } from "@/components/admin/service-manager";
import { listServiceCatalog } from "@/lib/actions/services";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requireRole("admin");
  const catalog = await listServiceCatalog();
  return <ServiceManager {...catalog} />;
}
