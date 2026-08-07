"use client";

import * as React from "react";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { exportTenantData } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type SiteOption = { id: number; name: string; slug: string };

export function ExportManager({ sites, currentSiteId }: { sites: SiteOption[]; currentSiteId: number }) {
  const [siteId, setSiteId] = React.useState(currentSiteId);
  const [pending, startTransition] = React.useTransition();

  function downloadExport() {
    startTransition(async () => {
      try {
        const data = await exportTenantData(siteId);
        const slug = data.site.slug || "site";
        const date = new Date().toISOString().slice(0, 10);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `admino-export-${slug}-${date}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("Tenant export downloaded.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to export tenant data.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Export tenant data</h1>
        <p className="mt-1 text-sm text-muted-foreground">Download a JSON backup of the selected tenant&apos;s content and operational records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="size-4" />Backup export</CardTitle>
          <CardDescription>Exports content, settings, pages, blocks, media records, commerce records, orders, and messages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteId">Tenant</Label>
            <select id="siteId" value={siteId} onChange={(event) => setSiteId(Number(event.target.value))} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name} (/{site.slug})</option>)}
            </select>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="size-4" />Security notes</p>
            <p className="mt-2">Secret settings, encrypted payment secrets, passwords, reset tokens, sessions, and rate-limit buckets are not included.</p>
            <p className="mt-1">Order/customer contact data is included. Treat downloaded files as sensitive.</p>
          </div>

          <Button onClick={downloadExport} disabled={pending || sites.length === 0} className="gap-2">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {pending ? "Preparing export..." : "Download JSON export"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
