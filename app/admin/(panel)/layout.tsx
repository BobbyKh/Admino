import { requireAdmin, type Role } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminSiteId, getAllAdminSites } from "@/lib/admin-site";
import { getEffectiveTenantFeatureAccess } from "@/lib/tenant-features";
import { getSiteSettings } from "@/lib/data";
import { AdminSiteProvider } from "@/components/admin/admin-site-context";
import { SiteSelector } from "@/components/admin/site-selector";
import { Globe } from "lucide-react";
import { buildThemeCss } from "@/lib/theme-css";

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
  const currentSite = sites.find((site) => site.id === currentSiteId);
  return (
    <AdminSiteProvider siteId={currentSiteId}>
    <style key={currentSiteId} dangerouslySetInnerHTML={{ __html: buildThemeCss(brandSettings) }} />
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
        <header className="hidden h-16 shrink-0 items-center justify-between border-b bg-background/95 px-8 backdrop-blur lg:flex">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="size-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active site</p>
              <p className="truncate text-sm font-semibold">{currentSite?.name ?? brandSettings.siteName}</p>
            </div>
          </div>
          {sites.length > 1 && <SiteSelector sites={sites} currentSiteId={currentSiteId} compact />}
        </header>
        <main key={currentSiteId} className="flex-1 overflow-x-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </AdminSiteProvider>
  );
}
