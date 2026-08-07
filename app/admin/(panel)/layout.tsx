import { requireAdmin, type Role } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminSiteId, getAllAdminSites } from "@/lib/admin-site";
import { getEffectiveTenantFeatureAccess } from "@/lib/tenant-features";
import { getSiteSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();
  const [sites, currentSiteId] = await Promise.all([getAllAdminSites(), getAdminSiteId()]);
  const [features, brandSettings] = await Promise.all([
    getEffectiveTenantFeatureAccess(currentSiteId, {
      role: user.role as Role,
      userId: user.id,
    }),
    getSiteSettings(currentSiteId),
  ]);
  return (
    <div className="flex min-h-svh bg-muted/30">
      <AdminNav
        adminName={user.name}
        role={user.role}
        sites={sites}
        currentSiteId={currentSiteId}
        features={features}
        brandLogo={brandSettings.logo}
        brandName={brandSettings.siteName}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main key={currentSiteId} className="flex-1 overflow-x-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
