"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  Eye,
  Globe,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUser } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import {
  getAdminUsers,
  getSitesForCurrentUser,
  getCurrentUserRole,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getUserFeatures,
  updateUserFeatures,
} from "@/lib/actions/index";
import {
  TENANT_FEATURE_METADATA,
  FEATURE_CATEGORIES,
  type TenantFeature,
} from "@/lib/tenant-features-constants";
import { useActionState } from "react";
import { toast } from "sonner";

type AdminActionState = { success?: boolean; message?: string };
type Site = { id: number; name: string; slug: string };

const ROLES = [
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "text-blue-600" },
  { value: "editor", label: "Editor", icon: Pencil, color: "text-green-600" },
  { value: "viewer", label: "Viewer", icon: Eye, color: "text-muted-foreground" },
];

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  editor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [accessUser, setAccessUser] = useState<AdminUser | null>(null);
  const [accessSelected, setAccessSelected] = useState<Set<TenantFeature>>(new Set());
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const [createState, createFormAction] = useActionState<AdminActionState, FormData>(createAdminUser, {});
  const [updateState, updateFormAction] = useActionState<AdminActionState, FormData>(updateAdminUser, {});

  useEffect(() => {
    Promise.all([getAdminUsers(), getSitesForCurrentUser(), getCurrentUserRole()]).then(([u, s, role]) => {
      setUsers(u);
      setSites(s);
      setCurrentUserRole(role);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (createState?.success) {
      toast.success("User created.");
      getAdminUsers().then((updatedUsers) => {
        setUsers(updatedUsers);
        setCreateOpen(false);
      });
    } else if (createState?.message) {
      toast.error(createState.message);
    }
  }, [createState]);

  useEffect(() => {
    if (updateState?.success) {
      toast.success("User updated.");
      getAdminUsers().then((updatedUsers) => {
        setUsers(updatedUsers);
        setEditingUser(null);
      });
    } else if (updateState?.message) {
      toast.error(updateState.message);
    }
  }, [updateState]);

  const getRoleIcon = (role: string) => {
    const r = ROLES.find((r) => r.value === role);
    if (!r) return Shield;
    return r.icon;
  };

  function openAccessDialog(user: AdminUser) {
    setAccessUser(user);
    setAccessMessage("");
    setAccessSelected(new Set());
    setAccessLoading(true);
    getUserFeatures(user.id).then((features) => {
      setAccessSelected(new Set(features));
      setAccessLoading(false);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage users for the active site. Platform super admins are managed separately.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form
              action={(fd) => {
                startTransition(() => createFormAction(fd));
              }}
              className="space-y-4"
            >
              {createState?.message && !createState.success && (
                <p className="text-sm text-destructive">{createState.message}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {currentUserRole === "super_admin" && sites.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="siteId">Site</Label>
                  <select
                    id="siteId"
                    name="siteId"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {currentUserRole === "super_admin" && sites.length <= 1 && (
                <input type="hidden" name="siteId" value={sites[0]?.id ?? ""} />
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating..." : "Create User"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <Users className="size-4 text-primary" />
          <CardTitle className="font-heading">Tenant Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const RoleIcon = getRoleIcon(user.role);
                    const userSite = sites.find((s) => s.id === user.siteId);
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                              <RoleIcon className={`size-4 ${ROLES.find((r) => r.value === user.role)?.color ?? ""}`} />
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={ROLE_BADGE[user.role] ?? ""} variant="outline">
                            {ROLES.find((r) => r.value === user.role)?.label ?? user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {userSite ? (
                            <Badge variant="outline" className="gap-1">
                              <Globe className="size-3" />
                              {userSite.name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Global</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAccessDialog(user)}
                              title="Manage feature access"
                            >
                              <KeyRound className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingUser(user)}
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
                                  <AlertDialogTitle>Delete {user.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this admin account.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      startTransition(() => {
                                        deleteAdminUser(user.id);
                                        setUsers((prev) => prev.filter((u) => u.id !== user.id));
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit {editingUser.name}</DialogTitle>
            </DialogHeader>
            <form
              action={(fd) => {
                fd.set("id", String(editingUser.id));
                startTransition(() => updateFormAction(fd));
              }}
              className="space-y-4"
            >
              {updateState?.message && !updateState.success && (
                <p className="text-sm text-destructive">{updateState.message}</p>
              )}
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input name="name" defaultValue={editingUser.name} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input name="email" type="email" defaultValue={editingUser.email} required />
              </div>
              <div className="space-y-2">
                <Label>New Password (leave blank to keep current)</Label>
                <Input name="password" type="password" minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {currentUserRole === "super_admin" && sites.length > 1 && (
                <div className="space-y-2">
                  <Label>Site</Label>
                  <select
                    name="siteId"
                    defaultValue={editingUser.siteId ?? undefined}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {currentUserRole === "super_admin" && sites.length <= 1 && (
                <input type="hidden" name="siteId" value={editingUser.siteId ?? sites[0]?.id ?? ""} />
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {/* Feature Access Dialog */}
      {accessUser && (
        <Dialog open={!!accessUser} onOpenChange={(open) => !open && setAccessUser(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="pr-6">
              <DialogTitle>Feature access — {accessUser.name}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Pick which tenant features this user can use. Leave everything unchecked to inherit
              every feature enabled for the site.
            </p>
            {accessLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
            ) : (
              <form
                action={() => {
                  startTransition(() => {
                    updateUserFeatures(accessUser.id, [...accessSelected]).then((result) => {
                      if (result?.success) {
                        setAccessUser(null);
                      } else {
                        setAccessMessage(result?.message ?? "Unable to update access.");
                      }
                    });
                  });
                }}
                className="space-y-4"
              >
                {accessMessage && <p className="text-sm text-destructive">{accessMessage}</p>}
                {FEATURE_CATEGORIES.map((category) => {
                  const features = Object.values(TENANT_FEATURE_METADATA).filter(
                    (meta) => meta.category === category
                  );
                  if (features.length === 0) return null;
                  const categoryKeys = features.map((meta) => meta.key);
                  const allSelected = categoryKeys.every((key) => accessSelected.has(key));
                  const toggleCategory = () => {
                    setAccessSelected((prev) => {
                      const next = new Set(prev);
                      if (allSelected) {
                        categoryKeys.forEach((key) => next.delete(key));
                      } else {
                        categoryKeys.forEach((key) => next.add(key));
                      }
                      return next;
                    });
                  };
                  return (
                      <div key={category}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
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
                          {features.map((meta) => {
                            const checked = accessSelected.has(meta.key);
                            return (
                              <label
                                key={meta.key}
                                className={cn(
                                  "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm transition-colors hover:border-primary/50",
                                  checked ? "border-primary/60 bg-primary/5" : "bg-background"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setAccessSelected((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(meta.key)) {
                                        next.delete(meta.key);
                                      } else {
                                        next.add(meta.key);
                                      }
                                      return next;
                                    });
                                  }}
                                  className="mt-0.5 size-4 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="block font-medium leading-tight">{meta.label}</span>
                                  <span className="block text-xs text-muted-foreground">
                                    {meta.description}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Saving..." : "Save Access"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
