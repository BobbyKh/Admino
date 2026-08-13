"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  createService,
  createServiceCategory,
  deleteService,
  deleteServiceCategory,
  updateService,
} from "@/lib/actions/services";
import type { Service, ServiceCategory } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/admin/media-picker";
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";

export function ServiceManager({
  categories,
  services,
}: {
  categories: ServiceCategory[];
  services: Service[];
}) {
  const siteId = useAdminSiteId();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState("");
  const [editingService, setEditingService] = React.useState<
    Service | null | undefined
  >(undefined);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const visibleServices = services.filter((service) =>
    service.title.toLowerCase().includes(query.toLowerCase()),
  );

  function saveService(formData: FormData) {
    startTransition(async () => {
      try {
        if (editingService) await updateService(editingService.id, formData);
        else await createService(formData);
        toast.success(editingService ? "Service updated." : "Service created.");
        setEditingService(undefined);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to save service.",
        );
      }
    });
  }

  function addCategory(formData: FormData) {
    startTransition(async () => {
      try {
        await createServiceCategory(formData);
        toast.success("Category created.");
        setCategoryOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to create category.",
        );
      }
    });
  }

  function removeService(service: Service) {
    if (!window.confirm(`Delete ${service.title}? This cannot be undone.`))
      return;
    startTransition(async () => {
      try {
        await deleteService(service.id);
        toast.success("Service deleted.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to delete service.",
        );
      }
    });
  }

  function removeCategory(category: ServiceCategory) {
    if (
      !window.confirm(
        `Delete ${category.name}? Services in this category will become uncategorized.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await deleteServiceCategory(category.id);
        toast.success("Category deleted.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to delete category.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage services and categories for the active site.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCategoryOpen(true)}>
            <FolderPlus className="mr-2 size-4" />
            Add category
          </Button>
          <Button onClick={() => setEditingService(null)}>
            <Plus className="mr-2 size-4" />
            Add service
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Service categories</CardTitle>
          <CardDescription>
            Use categories to organize the services shown in the Services Grid
            block.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="gap-2 py-1.5 pl-3"
                >
                  <span>{category.name}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    disabled={pending}
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No categories yet.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading">All services</CardTitle>
            <CardDescription>
              {services.length} service{services.length === 1 ? "" : "s"} on
              this site.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <BulkSelectionScope siteId={siteId} entity="services" ids={visibleServices.map((item) => item.id)} options={[{ value: "active", label: "Set active" }, { value: "inactive", label: "Hide" }, { value: "feature", label: "Feature" }, { value: "unfeature", label: "Remove featured" }]}><CardContent className="px-0 pb-0">
          {visibleServices.length ? (
            <Table className="min-w-[600px] table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><BulkSelectAll /></TableHead><TableHead className="w-72">Service</TableHead>
                  <TableHead className="w-44">Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell><BulkRowCheckbox id={service.id} label={`Select ${service.title}`} /></TableCell>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        {service.image ? (
                          <Image
                            src={service.image}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
                            className="size-9 rounded-md border object-cover"
                          />
                        ) : (
                          <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                            <Wrench className="size-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="w-52 min-w-0">
                          <p className="truncate font-medium">{service.title}</p>
                          {service.featured && (
                            <p className="flex items-center gap-1 text-xs text-primary">
                              <Star className="size-3 fill-current" />
                              Featured
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="block max-w-40 truncate">
                        {categoryNames.get(service.categoryId ?? 0) ?? "Uncategorized"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.active ? "default" : "secondary"}>
                        {service.active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-24 justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingService(service)}
                          aria-label={`Edit ${service.title}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => removeService(service)}
                          aria-label={`Delete ${service.title}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Wrench className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {services.length
                  ? "No services match your search."
                  : "No services yet. Add your first service to get started."}
              </p>
              {!services.length && (
                <Button size="sm" onClick={() => setEditingService(null)}>
                  Add service
                </Button>
              )}
            </div>
          )}
        </CardContent></BulkSelectionScope>
      </Card>
      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addCategory(new FormData(event.currentTarget));
            }}
          >
            <DialogHeader>
              <DialogTitle>Add service category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <Field label="Name" name="name" required />
              <Field
                label="Slug"
                name="slug"
                required
                placeholder="For example, consulting"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                Create category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={editingService !== undefined}
        onOpenChange={(open) => !open && setEditingService(undefined)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveService(new FormData(event.currentTarget));
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit service" : "Add service"}
              </DialogTitle>
              <DialogDescription>
                Services can be displayed dynamically with the Services Grid
                block.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5 md:grid-cols-2">
              <ServiceFields
                key={editingService?.id ?? "new"}
                service={editingService ?? undefined}
                categories={categories}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {editingService ? "Save changes" : "Create service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ServiceFields({
  service,
  categories,
}: {
  service?: Service;
  categories: ServiceCategory[];
}) {
  const [image, setImage] = React.useState(service?.image ?? "");
  return (
    <>
      <Field
        label="Title"
        name="title"
        required
        defaultValue={service?.title}
      />
      <div className="space-y-2">
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={service?.categoryId ?? ""}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Uncategorized</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <Textarea
          id="description"
          name="description"
          defaultValue={service?.description ?? ""}
          placeholder="Describe this service"
          rows={4}
        />
      </div>
      <div className="md:col-span-2 rounded-lg border bg-muted/20 p-4">
        <MediaPicker
          name="image"
          label="Service image"
          value={image}
          onChange={setImage}
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="active"
          defaultChecked={service?.active ?? true}
        />
        Visible on site
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={service?.featured}
        />
        Featured service
      </label>
    </>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
