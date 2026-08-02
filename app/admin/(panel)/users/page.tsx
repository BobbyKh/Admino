"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Eye,
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
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
} from "@/lib/cms-actions";
import { useActionState } from "react";

type AdminActionState = { success?: boolean; message?: string };

const ROLES = [
  { value: "super_admin", label: "Super Admin", icon: ShieldAlert, color: "text-red-600" },
  { value: "admin", label: "Admin", icon: ShieldCheck, color: "text-blue-600" },
  { value: "editor", label: "Editor", icon: Pencil, color: "text-green-600" },
  { value: "viewer", label: "Viewer", icon: Eye, color: "text-muted-foreground" },
];

const ROLE_BADGE: Record<string, string> = {
  super_admin: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  editor: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  viewer: "bg-muted text-muted-foreground",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [pending, startTransition] = useTransition();

  const [createState, createFormAction] = useActionState<AdminActionState, FormData>(createAdminUser, {});
  const [updateState, updateFormAction] = useActionState<AdminActionState, FormData>(updateAdminUser, {});

  useEffect(() => {
    getAdminUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (createState?.success) {
      getAdminUsers().then(setUsers);
      setCreateOpen(false);
    }
  }, [createState]);

  useEffect(() => {
    if (updateState?.success) {
      getAdminUsers().then(setUsers);
      setEditingUser(null);
    }
  }, [updateState]);

  const getRoleIcon = (role: string) => {
    const r = ROLES.find((r) => r.value === role);
    if (!r) return Shield;
    return r.icon;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage admin accounts and their permissions.
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
          <CardTitle className="font-heading">All Users ({users.length})</CardTitle>
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
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const RoleIcon = getRoleIcon(user.role);
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
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
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
