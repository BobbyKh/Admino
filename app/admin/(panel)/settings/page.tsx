import { SettingsForm } from "@/components/admin/settings-form";
import { getSettingsRows } from "@/lib/settings-admin";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const rows = await getSettingsRows();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edit the CMS content shown across the public website, plus Cloudinary
          and email (SMTP) configuration. Changes go live on the next
          revalidation.
        </p>
      </div>

      <SettingsForm initial={rows} />
    </div>
  );
}
