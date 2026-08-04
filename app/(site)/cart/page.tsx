import { CartPageClient } from "@/components/site/cart-page-client";
import { getResolvedSite } from "@/lib/site-context";
import { notFound } from "next/navigation";

export default async function CartPage({ searchParams }: { searchParams: Promise<{ site?: string }> }) {
  const { site } = await searchParams;
  if ((await getResolvedSite())?.template !== "ecommerce") notFound();
  return <CartPageClient siteSlug={site} />;
}
