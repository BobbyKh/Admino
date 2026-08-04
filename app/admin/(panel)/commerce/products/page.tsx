import { ProductManager } from "@/components/admin/product-manager";
import { listProducts } from "@/lib/actions/index";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireRole("admin");
  const products = await listProducts();

  return <ProductManager products={products} />;
}
