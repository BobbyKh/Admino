"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { updateCommerceSettings } from "@/lib/actions/index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CommerceManager({ commerceSettings }: { commerceSettings: { currency: string; taxRate: string; shippingName: string; shippingPrice: string; orderPrefix: string } }) {
  const [pending, startTransition] = React.useTransition();
  function save(formData: FormData) { startTransition(async () => { try { await updateCommerceSettings(formData); toast.success("Commerce settings saved."); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save settings."); } }); }

  return <div className="space-y-8"><div><h1 className="font-heading text-3xl font-semibold">Commerce</h1><p className="mt-1 text-sm text-muted-foreground">Configure your store and manage its catalog, payments, and orders.</p></div><div className="grid gap-4 lg:grid-cols-3"><ManagementCard icon={<Package className="size-4" />} title="Products" description="Create and manage your catalog." href="/admin/commerce/products" label="Manage products" /><ManagementCard icon={<CreditCard className="size-4" />} title="Payments" description="Configure tenant payment methods." href="/admin/commerce/payments" label="Payment settings" /><ManagementCard icon={<ShoppingBag className="size-4" />} title="Orders" description="Review and fulfill customer orders." href="/admin/commerce/orders" label="Manage orders" /></div><Card><CardHeader><CardTitle className="font-heading">Store setup</CardTitle><CardDescription>Set the tenant&apos;s currency, tax, shipping, and order-number format.</CardDescription></CardHeader><CardContent><form onSubmit={(event) => { event.preventDefault(); save(new FormData(event.currentTarget)); }} className="grid gap-4 md:grid-cols-2"><Field label="Currency" name="currency" defaultValue={commerceSettings.currency} placeholder="usd" /><Field label="Tax rate (%)" name="taxRate" type="number" min="0" max="100" defaultValue={commerceSettings.taxRate} /><Field label="Shipping method" name="shippingName" defaultValue={commerceSettings.shippingName} /><Field label="Shipping price (minor unit)" name="shippingPrice" type="number" min="0" defaultValue={commerceSettings.shippingPrice} /><Field label="Order prefix" name="orderPrefix" defaultValue={commerceSettings.orderPrefix} /><div className="flex items-end"><Button disabled={pending} size="sm">Save store setup</Button></div></form></CardContent></Card></div>;
}

function ManagementCard({ icon, title, description, href, label }: { icon: React.ReactNode; title: string; description: string; href: string; label: string }) { return <Card><CardHeader><CardTitle className="flex items-center gap-2 font-heading text-lg">{icon}{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><Button asChild size="sm"><Link href={href}>{label}</Link></Button></CardContent></Card>; }
function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>; }
