import Link from "next/link";
import { Package, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sellerLogout } from "@/lib/actions/seller";
import { requireSeller } from "@/lib/seller-auth";

export const dynamic = "force-dynamic";

export default async function SellerPortalLayout({ children }: { children: React.ReactNode }) {
  const seller = await requireSeller();
  return <div className="min-h-svh bg-slate-50"><header className="border-b bg-slate-950 text-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link href="/seller" className="flex items-center gap-3"><span className="rounded-lg bg-amber-400 p-2 text-slate-950"><Store className="size-5" /></span><span><span className="block text-xs uppercase tracking-widest text-slate-400">Seller portal</span><span className="font-semibold">{seller.storeName}</span></span></Link><nav className="flex items-center gap-2"><Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white"><Link href="/seller/products"><Package />Products</Link></Button><form action={sellerLogout}><Button variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-white hover:text-slate-950">Sign out</Button></form></nav></div></header><main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main></div>;
}
