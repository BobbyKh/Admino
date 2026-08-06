"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, FileText, Globe, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Site } from "@/lib/db/schema";
import {
  TENANT_FEATURE_METADATA,
  FEATURE_CATEGORIES,
  type TenantFeature,
} from "@/lib/tenant-features-constants";
import {
  createSite,
  updateSite,
  deleteSite,
  getAllTenantFeatureAccess,
  getSites,
} from "@/lib/actions/index";
import { useActionState } from "react";

type AdminActionState = { success?: boolean; message?: string };

const TEMPLATES = [
  { value: "blank", label: "Blank" },
  { value: "restaurant", label: "Restaurant" },
  { value: "portfolio", label: "Portfolio" },
  { value: "business", label: "Business" },
  { value: "blog", label: "Blog" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "landing", label: "Landing Page" },
];

export default function SitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [draftFeatures, setDraftFeatures] = useState<TenantFeature[]>([]);
  const [featureAccess, setFeatureAccess] = useState<Record<number, string[]>>({});
  const [copiedSiteId, setCopiedSiteId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([getSites(), getAllTenantFeatureAccess()]).then(([nextSites, access]) => {
      setSites(nextSites);
      setFeatureAccess(access);
    });
  }, []);

  const [createState, createFormAction] = useActionState<AdminActionState, FormData>(createSite, {});
  const [updateState, updateFormAction] = useActionState<AdminActionState, FormData>(updateSite, {});

  useEffect(() => {
    if (createState?.success) {
      Promise.all([getSites(), getAllTenantFeatureAccess()]).then(([updatedSites, access]) => {
        setSites(updatedSites);
        setFeatureAccess(access);
        setCreateOpen(false);
      });
    }
  }, [createState]);

  useEffect(() => {
    if (updateState?.success) {
      Promise.all([getSites(), getAllTenantFeatureAccess()]).then(([updatedSites, access]) => {
        setSites(updatedSites);
        setFeatureAccess(access);
        setEditingSite(null);
      });
    }
  }, [updateState]);

  function getSiteUrl(site: Site) {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return `${window.location.origin}/?site=${encodeURIComponent(site.slug)}`;
    }
    return site.domain ? `https://${site.domain}` : null;
  }

  async function copySiteUrl(site: Site) {
    const url = getSiteUrl(site);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiedSiteId(site.id);
    window.setTimeout(() => setCopiedSiteId(null), 2000);
  }

  function openSiteEdit(site: Site) {
    setEditingSite(site);
    setDraftFeatures(featureAccess[site.id] ?? []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sites</h1>
          <p className="text-sm text-muted-foreground">
            Manage your websites. Each site is a separate tenant.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              New Site
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Site</DialogTitle>
            </DialogHeader>
            <form
              action={(fd) => {
                startTransition(() => {
                  createFormAction(fd);
                });
              }}
              className="space-y-4"
            >
              {createState?.message && !createState.success && (
                <p className="text-sm text-destructive">{createState.message}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Site Name *</Label>
                <Input id="name" name="name" required placeholder="My Website" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (auto-generated)</Label>
                <Input id="slug" name="slug" placeholder="my-website" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <select
                  id="template"
                  name="template"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating..." : "Create Site"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {sites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No sites yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first site to get started.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Site
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="size-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{site.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">/{site.slug}</p>
                    </div>
                  </div>
                  <Badge variant={site.published ? "default" : "secondary"}>
                    {site.published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {site.description && (
                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {site.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Template: {site.template}</span>
                  <span>·</span>
                  <span>Created {new Date(site.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="size-3" />
                  {featureAccess[site.id]?.length ?? 0} of {Object.keys(TENANT_FEATURE_METADATA).length} features enabled
                </p>
                {site.published && getSiteUrl(site) ? (
                  <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/30 p-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={getSiteUrl(site)!}>
                      {getSiteUrl(site)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => copySiteUrl(site)}
                      aria-label={`Copy ${site.name} link`}
                      title="Copy link"
                    >
                      {copiedSiteId === site.id ? <Check /> : <Copy />}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {site.published ? "Add a domain to enable the live site link." : "Publish this site to enable its public link."}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {site.domain ? `Primary domain: ${site.domain}` : "No custom domain connected."}
                </p>
                <div className="mt-4 flex gap-2">
                  {site.published && getSiteUrl(site) && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={getSiteUrl(site)!} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-1 size-3" />
                        View Site
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSiteEdit(site)}
                  >
                    <Pencil className="mr-1 size-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/pages?siteId=${site.id}`)}
                  >
                    <FileText className="mr-1 size-3" />
                    Pages
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="size-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this site and all its content. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            startTransition(() => {
                              deleteSite(site.id);
                              setSites((prev) => prev.filter((s) => s.id !== site.id));
                            })
                          }
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingSite && (
        <Dialog open={!!editingSite} onOpenChange={(open) => !open && setEditingSite(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="pr-6">
              <DialogTitle>Edit {editingSite.name}</DialogTitle>
            </DialogHeader>
            <form
              action={(fd) => {
                fd.set("id", String(editingSite.id));
                startTransition(() => {
                  updateFormAction(fd);
                });
              }}
              className="space-y-4"
            >
              {updateState?.message && !updateState.success && (
                <p className="text-sm text-destructive">{updateState.message}</p>
              )}
              <div className="space-y-2">
                <Label>Site Name *</Label>
                <Input name="name" defaultValue={editingSite.name} required />
              </div>
               <div className="space-y-2">
                 <Label>Slug</Label>
                 <Input name="slug" defaultValue={editingSite.slug} disabled />
               </div>
               <div className="space-y-2">
                 <Label>Custom domain</Label>
                 <Input name="domain" defaultValue={editingSite.domain ?? ""} placeholder="www.example.com" />
                 <p className="text-xs text-muted-foreground">In Vercel, add this domain to the project, then point its DNS CNAME record to `cname.vercel-dns.com`.</p>
               </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" defaultValue={editingSite.description ?? ""} rows={2} />
              </div>
               <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={editingSite.published}
                  className="size-4"
                />
                 <Label>Published</Label>
               </div>
<div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                 <div>
                   <Label>Tenant features</Label>
                   <p className="mt-1 text-xs text-muted-foreground">Grant this tenant access to specific platform features. Leave a feature unchecked to disable it. Super admins always retain access, regardless of these toggles.</p>
                 </div>
                 {FEATURE_CATEGORIES.map((category) => {
                   const features = Object.values(TENANT_FEATURE_METADATA).filter(
                     (meta) => meta.category === category
                   );
                   if (features.length === 0) return null;
                   const categoryKeys = features.map((meta) => meta.key);
                   const allSelected = categoryKeys.every((key) => draftFeatures.includes(key));
                   const toggleCategory = () => {
                     setDraftFeatures((prev) =>
                       allSelected
                         ? prev.filter((key) => !categoryKeys.includes(key))
                         : [...new Set([...prev, ...categoryKeys])]
                     );
                   };
                   return (
                     <div key={category}>
                       <div className="mb-1.5 flex items-center justify-between">
                         <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                           {category}
                         </p>
                         <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground">
                           <input
                             type="checkbox"
                             checked={allSelected}
                             onChange={toggleCategory}
                             className="size-3.5"
                           />
                           Select all
                         </label>
                       </div>
                       <div className="grid gap-2 sm:grid-cols-2">
                         {features.map((meta) => (
                           <label
                             key={meta.key}
                             className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:border-primary/50"
                           >
                             <input
                               type="checkbox"
                               name={`feature_${meta.key}`}
                               checked={draftFeatures.includes(meta.key)}
                               onChange={() =>
                                 setDraftFeatures((prev) =>
                                   prev.includes(meta.key)
                                     ? prev.filter((key) => key !== meta.key)
                                     : [...prev, meta.key]
                                 )
                               }
                               className="size-4 shrink-0"
                             />
                             <span className="leading-tight">{meta.label}</span>
                           </label>
                         ))}
                       </div>
                     </div>
                   );
                 })}
               </div>
               <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


