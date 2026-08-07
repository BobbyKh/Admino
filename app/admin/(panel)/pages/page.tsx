"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FileText,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  Blocks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUploadField } from "@/components/admin/image-upload-field";
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
import type { Site, Page } from "@/lib/db/schema";
import {
  getSites,
  getPages,
  createPage,
  updatePage,
  deletePage,
} from "@/lib/actions/index";
import { useActionState } from "react";

type AdminActionState = { success?: boolean; message?: string; data?: { pageId?: number } };

export default function PagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const siteIdParam = searchParams.get("siteId");
  const [sites, setSites] = useState<Site[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const selectedSiteId = siteIdParam ? Number(siteIdParam) : sites[0]?.id ?? null;
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [createOgImage, setCreateOgImage] = useState("");
  const [editingOgImage, setEditingOgImage] = useState("");
  const [pending, startTransition] = useTransition();

  const [createState, createFormAction] = useActionState<AdminActionState, FormData>(createPage, {});
  const [updateState, updateFormAction] = useActionState<AdminActionState, FormData>(updatePage, {});

  // Load sites
  useEffect(() => {
    getSites().then(setSites);
  }, []);

  // Load pages when site is selected
  useEffect(() => {
    if (selectedSiteId) {
      getPages(selectedSiteId).then(setPages);
    }
  }, [selectedSiteId]);

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const publicHref = (slug: string) => {
    const path = slug === "home" ? "/" : `/${slug}`;
    return selectedSite ? `${path}?site=${encodeURIComponent(selectedSite.slug)}` : path;
  };

  // Handle create success
  useEffect(() => {
    if (createState?.success && selectedSiteId) {
      getPages(selectedSiteId).then((updated) => {
        setPages(updated);
        setCreateOpen(false);
        setCreateOgImage("");
      });
    }
  }, [createState, selectedSiteId]);

  // Handle update success
  useEffect(() => {
    if (updateState?.success && selectedSiteId) {
      getPages(selectedSiteId).then((updated) => {
        setPages(updated);
        setEditingPage(null);
      });
    }
  }, [updateState, selectedSiteId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-sm text-muted-foreground">
            Manage pages for your sites. Each page contains blocks.
          </p>
        </div>
        {selectedSiteId && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                New Page
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Page</DialogTitle>
              </DialogHeader>
              <form
                action={(fd) => {
                  fd.set("siteId", String(selectedSiteId));
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
                  <Label htmlFor="title">Page Title *</Label>
                  <Input id="title" name="title" required placeholder="About Us" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (auto-generated)</Label>
                  <Input id="slug" name="slug" placeholder="about-us" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" rows={2} />
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div>
                    <p className="text-sm font-medium">SEO</p>
                    <p className="text-xs text-muted-foreground">Optional overrides. Defaults use page title and description.</p>
                  </div>
                  <Input name="metaTitle" placeholder="Meta title" maxLength={80} />
                  <Textarea name="metaDescription" placeholder="Meta description" rows={2} maxLength={180} />
                  <ImageUploadField name="ogImage" label="OpenGraph image" value={createOgImage} onChange={setCreateOgImage} />
                  <Input name="canonicalUrl" placeholder="Canonical URL (https://...)" />
                  <label className="flex items-center gap-2 text-sm font-medium"><input name="noindex" type="checkbox" /> Hide from search engines</label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template">Template</Label>
                  <select
                    id="template"
                    name="template"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="default">Default</option>
                    <option value="full-width">Full Width</option>
                    <option value="sidebar">With Sidebar</option>
                    <option value="landing">Landing Page</option>
                    <option value="privacy-policy">Privacy Policy</option>
                    <option value="terms">Terms of Service</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="published" defaultChecked /> Published
                </label>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Creating..." : "Create Page"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Site selector */}
      <div className="flex items-center gap-4">
        <Label className="whitespace-nowrap">Select Site:</Label>
        <select
          value={selectedSiteId ?? ""}
          onChange={(e) => {
            const id = Number(e.target.value);
            router.push(`/admin/pages?siteId=${id}`);
          }}
          className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Choose a site...
          </option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name} (/{site.slug})
            </option>
          ))}
        </select>
      </div>

      {!selectedSiteId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">Select a site</p>
            <p className="text-sm text-muted-foreground">
              Choose a site above to manage its pages.
            </p>
          </CardContent>
        </Card>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">No pages yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Create your first page for {selectedSite?.name}.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Page
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <Card key={page.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex size-8 items-center justify-center rounded bg-muted">
                <FileText className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{page.title}</p>
                  <Badge variant={page.published ? "default" : "secondary"} className="text-xs">
                    {page.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  /{page.slug} · {page.template} · {new Date(page.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  disabled={!page.published}
                  title={page.published ? "View public page" : "Publish this page before viewing"}
                >
                  <a href={publicHref(page.slug)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/pages/${page.id}/editor`)}
                  title="Edit blocks"
                >
                  <Blocks className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setEditingPage(page); setEditingOgImage(page.ogImage ?? ""); }}
                  title="Page settings"
                >
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {page.title}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this page and all its blocks.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          startTransition(() => {
                            deletePage(page.id);
                            setPages((prev) => prev.filter((p) => p.id !== page.id));
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
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingPage && (
        <Dialog open={!!editingPage} onOpenChange={(open) => !open && setEditingPage(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {editingPage.title}</DialogTitle>
            </DialogHeader>
            <form
              action={(fd) => {
                fd.set("id", String(editingPage.id));
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
                <Label>Page Title *</Label>
                <Input name="title" defaultValue={editingPage.title} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input name="slug" defaultValue={editingPage.slug} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea name="description" defaultValue={editingPage.description ?? ""} rows={2} />
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div>
                  <Label>SEO</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Control how this page appears in search and social previews.</p>
                </div>
                <div className="space-y-2">
                  <Label>Meta title</Label>
                  <Input name="metaTitle" defaultValue={editingPage.metaTitle ?? ""} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label>Meta description</Label>
                  <Textarea name="metaDescription" defaultValue={editingPage.metaDescription ?? ""} rows={2} maxLength={180} />
                </div>
                <ImageUploadField name="ogImage" label="OpenGraph image" value={editingOgImage} onChange={setEditingOgImage} />
                <div className="space-y-2">
                  <Label>Canonical URL</Label>
                  <Input name="canonicalUrl" defaultValue={editingPage.canonicalUrl ?? ""} placeholder="https://example.com/page" />
                </div>
                <label className="flex items-center gap-2 text-sm font-medium"><input name="noindex" type="checkbox" defaultChecked={editingPage.noindex} /> Hide from search engines</label>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <select
                  name="template"
                  defaultValue={editingPage.template}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="default">Default</option>
                  <option value="full-width">Full Width</option>
                    <option value="sidebar">With Sidebar</option>
                    <option value="landing">Landing Page</option>
                    <option value="privacy-policy">Privacy Policy</option>
                    <option value="terms">Terms of Service</option>
                  </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={editingPage.published}
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
