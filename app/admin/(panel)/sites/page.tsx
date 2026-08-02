"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, Pencil, Trash2, ExternalLink, CheckCircle2, XCircle, FileText } from "lucide-react";
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
  createSite,
  updateSite,
  deleteSite,
  getSites,
} from "@/lib/cms-actions";
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
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getSites().then(setSites);
  }, []);

  const [createState, createFormAction] = useActionState<AdminActionState, FormData>(createSite, {});
  const [updateState, updateFormAction] = useActionState<AdminActionState, FormData>(updateSite, {});

  useEffect(() => {
    if (createState?.success) {
      getSites().then(setSites);
      setCreateOpen(false);
    }
  }, [createState]);

  useEffect(() => {
    if (updateState?.success) {
      getSites().then(setSites);
      setEditingSite(null);
    }
  }, [updateState]);

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
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSite(site)}
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
          <DialogContent>
            <DialogHeader>
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


