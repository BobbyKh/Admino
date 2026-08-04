import { SettingsForm } from "@/components/admin/settings-form";
import { getAdminSiteId, getAllAdminSites } from "@/lib/admin-site";
import { getSettingsRows } from "@/lib/settings-admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [rows, activeSiteId, sites] = await Promise.all([
    getSettingsRows(),
    getAdminSiteId(),
    getAllAdminSites(),
  ]);
  const activeSite = sites.find((site) => site.id === activeSiteId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Editing {activeSite?.name ?? "the active site"}. Changes apply only to this
          tenant and go live on the next revalidation.
        </p>
      </div>

      <SettingsForm key={activeSiteId} initial={rows} />
    </div>
  );
}
