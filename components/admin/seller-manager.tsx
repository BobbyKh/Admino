"use client";

import * as React from "react";
import { Check, Store, UserCheck, UserRoundSearch, X } from "lucide-react";
import { toast } from "sonner";
import { reviewSellerApplication } from "@/lib/actions/marketplace";
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { SellerApplication } from "@/lib/db/schema";
import { BulkExportScope, ExportRowCheckbox, ExportSelectAll } from "@/components/admin/bulk-export-scope";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";

type Seller = { id: number; name: string; contactEmail: string; status: string; verifiedAt: string; storeId: number | null; storeName: string | null; storeSlug: string | null };

export function SellerManager({ applications, sellers }: { applications: SellerApplication[]; sellers: Seller[] }) {
  const siteId = useAdminSiteId();
  const [pending, startTransition] = React.useTransition();
  const [notes, setNotes] = React.useState<Record<number, string>>({});
  const pendingCount = applications.filter((item) => item.status === "pending").length;
  function review(application: SellerApplication, decision: "approved" | "rejected") {
    startTransition(async () => { try { await reviewSellerApplication(siteId, application.id, decision, notes[application.id]); toast.success(decision === "approved" ? "Seller approved and store created." : "Application rejected."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to review application."); } });
  }
  return <div className="space-y-6">
    <div><p className="text-sm font-medium text-primary">Optional site module</p><h1 className="font-heading text-3xl font-semibold">Marketplace sellers</h1><p className="mt-1 text-sm text-muted-foreground">Review applications and manage seller identities for this website only.</p></div>
    <div className="grid gap-4 sm:grid-cols-3"><Summary icon={<UserRoundSearch />} label="Pending review" value={pendingCount} /><Summary icon={<UserCheck />} label="Approved sellers" value={sellers.length} /><Summary icon={<Store />} label="Active stores" value={sellers.filter((seller) => seller.status === "active").length} /></div>
    <BulkExportScope rows={applications} filename="seller-applications.csv"><Card><CardHeader><div className="flex items-center gap-2"><ExportSelectAll /><div><CardTitle>Applications</CardTitle><CardDescription>{applications.length} submitted application{applications.length === 1 ? "" : "s"}.</CardDescription></div></div></CardHeader><CardContent className="space-y-4">{applications.length === 0 ? <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No seller applications yet. Add `/sell` to this site&apos;s navigation when you are ready to recruit sellers.</p> : applications.map((application) => <article key={application.id} className="rounded-xl border p-4 sm:p-5"><div className="mb-3"><ExportRowCheckbox id={application.id} label={`Select ${application.businessName}`} /></div><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{application.businessName}</h3><p className="text-sm text-muted-foreground">{application.contactName} · {application.email} · {application.country}</p></div><Badge variant={application.status === "approved" ? "default" : application.status === "rejected" ? "destructive" : "secondary"}>{application.status}</Badge></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{application.description}</p>{application.website && <a href={application.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">{application.website}</a>}{application.status === "pending" ? <div className="mt-4 space-y-3 border-t pt-4"><Textarea value={notes[application.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [application.id]: event.target.value }))} placeholder="Review notes (required for rejection)" maxLength={1000} /><div className="flex flex-wrap gap-2"><Button disabled={pending} onClick={() => review(application, "approved")}><Check />Approve and create store</Button><Button disabled={pending} variant="destructive" onClick={() => review(application, "rejected")}><X />Reject</Button></div></div> : application.reviewNotes && <p className="mt-4 rounded-lg bg-muted p-3 text-sm">{application.reviewNotes}</p>}</article>)}</CardContent></Card></BulkExportScope>
    {sellers.length > 0 && <BulkSelectionScope siteId={siteId} entity="sellers" ids={sellers.map((seller) => seller.id)} options={[{ value: "activate", label: "Activate sellers and stores" }, { value: "suspend", label: "Suspend sellers and stores", destructive: true }]}><Card><CardHeader><div className="flex flex-wrap items-center gap-3"><BulkSelectAll /><div><CardTitle>Verified sellers</CardTitle><CardDescription>Select sellers below, then use the bulk toolbar to activate or suspend their organizations and stores.</CardDescription></div></div></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{sellers.map((seller) => <div key={seller.id} className="rounded-lg border p-4"><div className="mb-3"><BulkRowCheckbox id={seller.id} label={`Select ${seller.name}`} /></div><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{seller.name}</p><p className="text-sm text-muted-foreground">{seller.contactEmail}</p></div><Badge variant={seller.status === "active" ? "default" : "secondary"}>{seller.status}</Badge></div>{seller.storeName && <p className="mt-3 text-sm"><Store className="mr-1 inline size-4 text-primary" />{seller.storeName} <span className="text-muted-foreground">/{seller.storeSlug}</span></p>}</div>)}</CardContent></Card></BulkSelectionScope>}
  </div>;
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <Card><CardContent className="p-5"><div className="mb-2 text-primary [&_svg]:size-5">{icon}</div><p className="font-heading text-2xl font-semibold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>; }
