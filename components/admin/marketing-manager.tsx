"use client";

import * as React from "react";
import { Mail, Megaphone, Plus, Send, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createEmailCampaign, createNewProductCampaign, deleteEmailCampaign, queueEmailCampaign, sendCampaignTest, type getMarketingDashboard } from "@/lib/actions/index";
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";
import { BulkExportScope, ExportRowCheckbox, ExportSelectAll } from "@/components/admin/bulk-export-scope";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type Dashboard = Awaited<ReturnType<typeof getMarketingDashboard>>;

export function MarketingManager({ data }: { data: Dashboard }) {
  const siteId = useAdminSiteId();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const active = data.subscribers.filter((subscriber) => subscriber.status === "active").length;
  function run(task: () => Promise<unknown>, success: string) { startTransition(async () => { try { await task(); toast.success(success); setOpen(false); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Operation failed."); } }); }
  function create(formData: FormData) { run(() => createEmailCampaign(formData), "Campaign saved."); }
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-3xl font-semibold">Email Marketing</h1><p className="mt-1 text-sm text-muted-foreground">Consent-based subscribers, campaigns, and durable delivery operations.</p></div><Button onClick={() => setOpen(true)}><Plus />New campaign</Button></div>
    <div className="grid gap-4 sm:grid-cols-3"><Stat icon={<Users />} label="Active subscribers" value={active} /><Stat icon={<Megaphone />} label="Campaigns" value={data.campaigns.length} /><Stat icon={<Mail />} label="Queued / failed" value={(data.queue.pending ?? 0) + (data.queue.failed ?? 0)} /></div>
    <Tabs defaultValue="campaigns"><TabsList><TabsTrigger value="campaigns">Campaigns</TabsTrigger><TabsTrigger value="subscribers">Subscribers</TabsTrigger><TabsTrigger value="queue">Delivery queue</TabsTrigger></TabsList>
      <TabsContent value="campaigns" className="space-y-4">
        <Card><CardHeader><CardTitle>New-product campaign</CardTitle><CardDescription>Create a professional draft directly from an active product.</CardDescription></CardHeader><CardContent><div className="flex flex-wrap gap-2">{data.products.slice(0, 12).map((product) => <Button key={product.id} variant="outline" size="sm" disabled={pending} onClick={() => run(() => createNewProductCampaign(product.id), "New-product campaign created.")}>{product.title}</Button>)}</div></CardContent></Card>
        <BulkSelectionScope siteId={siteId} entity="campaigns" ids={data.campaigns.map((item) => item.id)} options={[{ value: "delete_drafts", label: "Delete drafts", destructive: true }]}>
          {data.campaigns.length > 0 && <div className="flex items-center gap-2 rounded-lg border p-3"><BulkSelectAll /><span className="text-sm text-muted-foreground">Select all campaigns</span></div>}
          {data.campaigns.map((campaign) => <Card key={campaign.id}><CardHeader className="flex-row items-start gap-3"><BulkRowCheckbox id={campaign.id} label={`Select ${campaign.name}`} /><div className="mr-auto"><CardTitle className="text-lg">{campaign.name}</CardTitle><CardDescription>{campaign.subject}</CardDescription></div><Badge variant={campaign.status === "sent" ? "default" : "secondary"}>{campaign.status}</Badge></CardHeader><CardContent><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{campaign.type.replace("_", " ")}</span><span>{campaign.recipientCount} recipients</span>{campaign.scheduledAt && <span>Scheduled {new Date(campaign.scheduledAt).toLocaleString()}</span>}</div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" disabled={pending || !["draft", "scheduled"].includes(campaign.status)} onClick={() => run(() => queueEmailCampaign(campaign.id), "Campaign queued.")}><Send />Queue now</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => { const email = window.prompt("Test recipient email"); if (email) run(() => sendCampaignTest(campaign.id, email), "Test queued."); }}>Send test</Button><Button size="sm" variant="destructive" disabled={pending || campaign.status !== "draft"} onClick={() => run(() => deleteEmailCampaign(campaign.id), "Draft deleted.")}><Trash2 /></Button></div></CardContent></Card>)}
        </BulkSelectionScope>
      </TabsContent>
      <TabsContent value="subscribers" className="space-y-3"><BulkExportScope rows={data.subscribers} filename="newsletter-subscribers.csv">{data.subscribers.length > 0 && <div className="flex items-center gap-2 rounded-lg border p-3"><ExportSelectAll /><span className="text-sm text-muted-foreground">Select all subscribers</span></div>}{data.subscribers.map((subscriber) => <Card key={subscriber.id}><CardContent className="flex flex-wrap items-center gap-3 p-4"><ExportRowCheckbox id={subscriber.id} label={`Select ${subscriber.email}`} /><div className="mr-auto"><p className="font-medium">{subscriber.email}</p><p className="text-xs text-muted-foreground">{subscriber.source} · {new Date(subscriber.createdAt).toLocaleDateString()}</p></div><Badge variant={subscriber.status === "active" ? "default" : "secondary"}>{subscriber.status}</Badge></CardContent></Card>)}</BulkExportScope></TabsContent>
      <TabsContent value="queue"><Card><CardHeader><CardTitle>Queue health</CardTitle><CardDescription>Jobs are claimed with row locking and retried with backoff.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{["pending", "processing", "sent", "failed", "dead"].map((status) => <div key={status} className="rounded-lg border p-4"><p className="text-xs capitalize text-muted-foreground">{status}</p><p className="text-2xl font-semibold">{data.queue[status] ?? 0}</p></div>)}</CardContent></Card></TabsContent>
    </Tabs>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><form onSubmit={(event) => { event.preventDefault(); create(new FormData(event.currentTarget)); }}><DialogHeader><DialogTitle>New email campaign</DialogTitle><DialogDescription>Create a draft or schedule it for later delivery.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 md:grid-cols-2"><Field name="name" label="Campaign name" required /><Field name="subject" label="Subject" required /><Select name="type" label="Type" options={["newsletter", "new_product"]} /><Field name="scheduledAt" label="Schedule" type="datetime-local" /><div className="md:col-span-2"><Field name="previewText" label="Preview text" /></div><div className="space-y-2 md:col-span-2"><Label htmlFor="content">HTML content</Label><Textarea id="content" name="content" rows={10} required /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button disabled={pending}>Save campaign</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <Card><CardContent className="flex items-center gap-3 p-5"><span className="text-primary [&>svg]:size-5">{icon}</span><div><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>; }
function Field({ name, label, ...props }: React.ComponentProps<typeof Input> & { name: string; label: string }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>; }
function Select({ name, label, options }: { name: string; label: string; options: string[] }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><select id={name} name={name} className="w-full rounded-md border bg-background px-3 py-2 text-sm">{options.map((option) => <option key={option}>{option}</option>)}</select></div>; }
