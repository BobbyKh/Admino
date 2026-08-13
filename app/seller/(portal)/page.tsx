import Link from "next/link";
import { Package, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listSellerProducts } from "@/lib/actions/seller";
import { requireSeller } from "@/lib/seller-auth";

export default async function SellerDashboardPage() {
  const [seller, products] = await Promise.all([requireSeller(), listSellerProducts()]);
  return <div className="space-y-6"><div><p className="text-sm font-medium text-amber-700">{seller.sellerName}</p><h1 className="text-3xl font-semibold tracking-tight">Store overview</h1><p className="mt-1 text-muted-foreground">Welcome back, {seller.name}.</p></div><div className="grid gap-4 sm:grid-cols-2"><Card><CardHeader><Package className="size-5 text-amber-700" /><CardTitle>{products.length} products</CardTitle></CardHeader><CardContent><Button asChild><Link href="/seller/products">Manage catalog</Link></Button></CardContent></Card><Card><CardHeader><Store className="size-5 text-amber-700" /><CardTitle>{seller.storeName}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Your verified marketplace store is active.</p></CardContent></Card></div></div>;
}
