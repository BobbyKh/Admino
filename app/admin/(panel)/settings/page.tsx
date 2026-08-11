import { SettingsForm } from "@/components/admin/settings-form";
import { getAllAdminSites } from "@/lib/admin-site";
import { getSettingsRows } from "@/lib/settings-admin";
import { requireRole } from "@/lib/auth";
import { getCurrentSiteRequiringFeature } from "@/lib/tenant-access";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireRole("admin");
  const activeSiteId = await getCurrentSiteRequiringFeature("settings");
  const [rows, sites] = await Promise.all([
    getSettingsRows(activeSiteId),
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
