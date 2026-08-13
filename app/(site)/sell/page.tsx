import { notFound } from "next/navigation";
import { BadgeCheck, Store, Users } from "lucide-react";
import { SellerApplicationForm } from "@/components/site/seller-application-form";
import { Card, CardContent } from "@/components/ui/card";
import { isMarketplaceEnabled } from "@/lib/actions/marketplace";
import { getResolvedSite, getResolvedSiteId } from "@/lib/site-context";

export const dynamic = "force-dynamic";

export default async function SellPage() {
  const siteId = await getResolvedSiteId();
  if (!siteId || !(await isMarketplaceEnabled(siteId))) notFound();
  const site = await getResolvedSite();
  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
    <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-medium uppercase tracking-widest text-primary">Seller program</p><h1 className="mt-2 font-heading text-4xl font-semibold sm:text-5xl">Sell on {site?.name ?? "our marketplace"}</h1><p className="mt-4 text-muted-foreground">Apply to open a verified store. Every application is reviewed before a seller account is activated.</p></div>
    <div className="my-10 grid gap-4 sm:grid-cols-3"><Benefit icon={<Store className="size-5" />} title="Your store" text="A dedicated seller identity within this website." /><Benefit icon={<BadgeCheck className="size-5" />} title="Verified onboarding" text="Business details are reviewed by the marketplace team." /><Benefit icon={<Users className="size-5" />} title="Team ready" text="Seller roles can support owners, managers, and staff." /></div>
    <Card><CardContent className="p-6 sm:p-8"><SellerApplicationForm /></CardContent></Card>
  </div>;
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-xl border p-5"><div className="mb-3 text-primary">{icon}</div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}
