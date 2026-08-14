"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Package, Pencil, Plus, Search, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createProduct, deleteProduct, updateProduct } from "@/lib/actions/index";
import { generateProductDescriptionWithAi } from "@/lib/actions/product-ai";
import type { Product } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/admin/media-picker";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAdminSiteId } from "./admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "./bulk-selection-scope";

const productStatuses = ["draft", "active", "archived"] as const;

export function ProductManager({ products }: { products: Product[] }) {
  const siteId = useAdminSiteId();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState("");
  const [editingProduct, setEditingProduct] = React.useState<Product | null | undefined>(undefined);
  const [deletingProduct, setDeletingProduct] = React.useState<Product | null>(null);
  const visibleProducts = products.filter((product) => product.title.toLowerCase().includes(query.toLowerCase()) || product.slug.includes(query.toLowerCase()));
  const dialogOpen = editingProduct !== undefined;

  function saveProduct(formData: FormData) {
    startTransition(async () => {
      try {
        if (editingProduct) await updateProduct(siteId, editingProduct.id, formData);
        else await createProduct(siteId, formData);
        toast.success(editingProduct ? "Product updated." : "Product created.");
        setEditingProduct(undefined);
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save product."); }
    });
  }

  function confirmDeleteProduct(product: Product) {
    setDeletingProduct(product);
  }

  function removeProduct() {
    if (!deletingProduct) return;
    startTransition(async () => {
      try { await deleteProduct(siteId, deletingProduct.id); toast.success("Product deleted."); setDeletingProduct(null); router.refresh(); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete product."); setDeletingProduct(null); }
    });
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-3xl font-semibold">Products</h1><p className="mt-1 text-sm text-muted-foreground">Manage the products available on this site.</p></div><Button onClick={() => setEditingProduct(null)}><Plus className="mr-2 size-4" />Add product</Button></div>
    <Card><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="font-heading">All products</CardTitle><CardDescription>{products.length} product{products.length === 1 ? "" : "s"} in this catalog.</CardDescription></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" className="pl-9" /></div></CardHeader><BulkSelectionScope siteId={siteId} entity="products" ids={visibleProducts.map((item) => item.id)} options={[{ value: "active", label: "Set active" }, { value: "draft", label: "Set draft" }, { value: "archived", label: "Archive" }, { value: "feature", label: "Feature" }, { value: "unfeature", label: "Remove featured" }]}><CardContent className="px-0 pb-0">
      {visibleProducts.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><Package className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{products.length === 0 ? "No products yet. Add your first product to start selling." : "No products match your search."}</p>{products.length === 0 && <Button size="sm" onClick={() => setEditingProduct(null)}>Add product</Button>}</div> : <Table className="min-w-[680px] table-fixed"><TableHeader><TableRow><TableHead className="w-10"><BulkSelectAll /></TableHead><TableHead className="w-72">Product</TableHead><TableHead>Status</TableHead><TableHead>Price</TableHead><TableHead>Inventory</TableHead><TableHead className="w-28 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visibleProducts.map((product) => <TableRow key={product.id}><TableCell><BulkRowCheckbox id={product.id} label={`Select ${product.title}`} /></TableCell><TableCell><div className="flex min-w-0 items-center gap-3">{product.image ? <Image src={product.image} alt="" width={36} height={36} unoptimized className="size-9 rounded-md border object-cover" /> : product.video ? <video src={product.video} width={36} height={36} className="size-9 rounded-md border object-cover" controls /> : <div className="flex size-9 items-center justify-center rounded-md bg-muted"><Package className="size-4 text-muted-foreground" /></div>}<div className="w-52 min-w-0"><p className="truncate font-medium">{product.title}</p><p className="truncate text-xs text-muted-foreground">/{product.slug}</p></div></div></TableCell><TableCell><Badge variant={product.status === "active" ? "default" : "secondary"} className="capitalize">{product.status}</Badge></TableCell><TableCell>{formatPrice(product.price, product.currency)}</TableCell><TableCell>{product.inventoryQuantity}</TableCell><TableCell><div className="flex min-w-24 justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setEditingProduct(product)} aria-label={`Edit ${product.title}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => confirmDeleteProduct(product)} aria-label={`Delete ${product.title}`}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></BulkSelectionScope></Card>
    <Dialog open={dialogOpen} onOpenChange={(open) => !open && setEditingProduct(undefined)}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl"><form onSubmit={(event) => { event.preventDefault(); saveProduct(new FormData(event.currentTarget)); }}><DialogHeader><DialogTitle>{editingProduct ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>Prices use minor currency units, for example 2500 is $25.00. Choose a product image from the Media Library below.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 md:grid-cols-2"><ProductFields key={editingProduct?.id ?? "new"} siteId={siteId} product={editingProduct ?? undefined} /></div><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{editingProduct ? "Save changes" : "Create product"}</Button></DialogFooter></form></DialogContent></Dialog>
    <AlertDialog open={deletingProduct !== null} onOpenChange={(open) => !open && setDeletingProduct(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete &quot;{deletingProduct?.title}&quot; from your catalog and cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={removeProduct} disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{pending && <Loader2 className="mr-2 size-4 animate-spin" />}Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function ProductFields({ siteId, product }: { siteId: number; product?: Product }) {
  const [image, setImage] = React.useState(product?.image ?? "");
  const [video, setVideo] = React.useState(product?.video ?? "");
  const [aiLoading, setAiLoading] = React.useState(false);

  async function handleGenerateDescription() {
    const title = (document.querySelector("[name=title]") as HTMLInputElement | null)?.value;
    if (!title) { toast.error("Enter a product title first."); return; }
    setAiLoading(true);
    try {
      const result = await generateProductDescriptionWithAi(siteId, title);
      if ("copy" in result) {
        const input = document.querySelector("[name=description]") as HTMLTextAreaElement | null;
        if (input) input.value = result.copy.description;
        toast.success(`AI generated description and badge: "${result.copy.badge}"`);
      } else toast.error(result.error);
    } catch { toast.error("Failed to generate product copy."); }
    finally { setAiLoading(false); }
  }

  return <>
    <Field label="Title" name="title" required defaultValue={product?.title} />
    <Field label="Slug" name="slug" required defaultValue={product?.slug} />
    <Field label="Category" name="category" defaultValue={product?.category ?? ""} placeholder="For example, Clothing" />
    <Field label="Price (minor unit)" name="price" type="number" min="0" required defaultValue={product?.price} />
    <Field label="Currency (for example, USD)" name="currency" required minLength={3} maxLength={3} defaultValue={product?.currency ?? "usd"} />
    <Field label="Inventory" name="inventoryQuantity" type="number" min="0" required defaultValue={product?.inventoryQuantity ?? 0} />
    <div className="space-y-2"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={product?.status ?? "draft"} className="w-full rounded-md border bg-background px-3 py-2 text-sm">{productStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
    <Field label="Sizes (optional, comma-separated)" name="sizes" defaultValue={optionList(product?.sizes)} placeholder="S, M, L" />
    <Field label="Colors (optional, comma-separated)" name="colors" defaultValue={optionList(product?.colors)} placeholder="Black, Blue" />
    <div className="space-y-2 md:col-span-2"><Label htmlFor="wholesaleTiers">Wholesale tiers (quantity:price)</Label><Input id="wholesaleTiers" name="wholesaleTiers" defaultValue={tierList(product?.wholesaleTiers)} placeholder="10:2200, 50:1900, 100:1700" /><p className="text-xs text-muted-foreground">Use minor currency units. Larger quantities must have progressively lower prices.</p></div>
    <div className="space-y-2 md:col-span-2"><div className="flex items-center justify-between"><Label htmlFor="description">Description</Label><Button type="button" variant="outline" size="sm" disabled={aiLoading} onClick={handleGenerateDescription}><Sparkles className="mr-1 size-3.5 text-primary" />{aiLoading ? "Generating..." : "AI Generate"}</Button></div><Textarea id="description" name="description" defaultValue={product?.description ?? ""} rows={3} /></div>
<div className="rounded-lg border bg-muted/20 p-4 md:col-span-2"><MediaPicker name="image" label="Product image" value={image} onChange={setImage} /></div>
    <div className="rounded-lg border bg-muted/20 p-4 md:col-span-2"><MediaPicker name="video" label="Product video" value={video} onChange={setVideo} type="video" /></div>
    <label className="flex items-end gap-2 pb-2 text-sm font-medium"><input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured product</label>
  </>;
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>; }

function formatPrice(price: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(price / 100); }
function optionList(raw: string | null | undefined) { try { const parsed = JSON.parse(raw ?? "[]"); return Array.isArray(parsed) ? parsed.join(", ") : ""; } catch { return ""; } }
function tierList(raw: string | null | undefined) { try { const parsed = JSON.parse(raw ?? "[]") as Array<{ minQuantity: number; unitPrice: number }>; return Array.isArray(parsed) ? parsed.map((tier) => `${tier.minQuantity}:${tier.unitPrice}`).join(", ") : ""; } catch { return ""; } }
