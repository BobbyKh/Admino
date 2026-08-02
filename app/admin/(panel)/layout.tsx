import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminSiteId, getAllAdminSites } from "@/lib/admin-site";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const [sites, currentSiteId] = await Promise.all([getAllAdminSites(), getAdminSiteId()]);
  return (
    <div className="flex min-h-svh bg-muted/30">
      <AdminNav adminName={user.name} sites={sites} currentSiteId={currentSiteId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-x-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
