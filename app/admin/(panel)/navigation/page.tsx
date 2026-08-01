"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ExternalLink, Link, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addNavLink,
  deleteNavLink,
  getNavLinks,
  reorderNavLinks,
  updateNavLink,
} from "@/lib/cms-actions";
import type { NavLink } from "@/lib/db/schema";

export default function NavigationPage() {
  const [links, setLinks] = React.useState<NavLink[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [showAdd, setShowAdd] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);

  React.useEffect(() => {
    getNavLinks().then(setLinks).finally(() => setLoading(false));
  }, []);

  function moveUp(index: number) {
    if (index === 0) return;
    const newLinks = [...links];
    [newLinks[index - 1], newLinks[index]] = [newLinks[index], newLinks[index - 1]];
    const orderedIds = newLinks.map((l) => l.id);
    setLinks(newLinks);
    startTransition(async () => {
      await reorderNavLinks(orderedIds);
    });
  }

  function moveDown(index: number) {
    if (index === links.length - 1) return;
    const newLinks = [...links];
    [newLinks[index], newLinks[index + 1]] = [newLinks[index + 1], newLinks[index]];
    const orderedIds = newLinks.map((l) => l.id);
    setLinks(newLinks);
    startTransition(async () => {
      await reorderNavLinks(orderedIds);
    });
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addNavLink({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowAdd(false);
        const updated = await getNavLinks();
        setLinks(updated);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleUpdate(id: number, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", String(id));
    startTransition(async () => {
      const result = await updateNavLink({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setEditingId(null);
        const updated = await getNavLinks();
        setLinks(updated);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteNavLink(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast.success("Link deleted");
    });
  }

  function handleToggleVisibility(id: number, visible: boolean) {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    const formData = new FormData();
    formData.set("id", String(id));
    formData.set("label", link.label);
    formData.set("href", link.href);
    if (visible) formData.set("visible", "on");
    if (link.external) formData.set("external", "on");
    startTransition(async () => {
      await updateNavLink({}, formData);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, visible } : l)));
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Navigation</h1>
          <p className="text-sm text-muted-foreground">
            Manage the navigation links shown in the header and footer.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2">
          <Plus className="size-4" />
          Add Link
        </Button>
      </div>

      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add Navigation Link</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input name="label" placeholder="About" required className="w-40" />
              </div>
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input name="href" placeholder="/about" required className="w-48" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="external" className="size-4 rounded" />
                External
              </label>
              <Button type="submit" disabled={pending} size="sm">
                {pending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Menu Links ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {links.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No navigation links yet. Add one to get started.
            </p>
          )}
          {links.map((link, i) => (
            <div
              key={link.id}
              className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex flex-col gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={i === 0}
                  onClick={() => moveUp(i)}
                >
                  <ArrowUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  disabled={i === links.length - 1}
                  onClick={() => moveDown(i)}
                >
                  <ArrowDown className="size-3" />
                </Button>
              </div>

              <Link className="size-4 shrink-0 text-muted-foreground" />

              {editingId === link.id ? (
                <form
                  onSubmit={(e) => handleUpdate(link.id, e)}
                  className="flex flex-1 flex-wrap items-center gap-2"
                >
                  <Input name="label" defaultValue={link.label} className="w-32" required />
                  <Input name="href" defaultValue={link.href} className="w-48" required />
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      name="external"
                      defaultChecked={link.external}
                      className="size-3"
                    />
                    External
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      name="visible"
                      defaultChecked={link.visible}
                      className="size-3"
                    />
                    Visible
                  </label>
                  <Button type="submit" size="sm" className="h-7">
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{link.label}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{link.href}</span>
                    {link.external && (
                      <ExternalLink className="ml-1 inline size-3 text-muted-foreground" />
                    )}
                  </div>
                  <Switch
                    checked={link.visible}
                    onCheckedChange={(val) => handleToggleVisibility(link.id, val)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(link.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
