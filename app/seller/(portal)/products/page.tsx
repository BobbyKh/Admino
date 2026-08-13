import { SellerProductManager } from "@/components/seller/seller-product-manager";
import { listSellerProducts } from "@/lib/actions/seller";

export default async function SellerProductsPage() {
  return <SellerProductManager products={await listSellerProducts()} />;
}
