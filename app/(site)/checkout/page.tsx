import { CheckoutPageClient } from "@/components/site/checkout-page-client";
import { getResolvedSite } from "@/lib/site-context";
import { notFound } from "next/navigation";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  if ((await getResolvedSite())?.template !== "ecommerce") notFound();
  return <CheckoutPageClient siteSlug={site} />;
}
