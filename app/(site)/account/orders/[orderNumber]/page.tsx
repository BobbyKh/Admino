import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionCustomer } from "@/lib/customer-auth";
import { getCustomerOrder } from "@/lib/actions/customers";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/account/login");

  const { orderNumber } = await params;
  const order = await getCustomerOrder(orderNumber);
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to orders
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge className={STATUS_STYLES[order.status] ?? ""}>
          {order.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <h3 className="font-semibold">Items</h3>
          {order.items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-lg border p-3">
              {item.productImage && (
                <img
                  src={item.productImage}
                  alt={item.title}
                  className="size-16 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <p className="font-medium">{item.title}</p>
                {item.selectedOptions && item.selectedOptions !== "{}" && (
                  <p className="text-xs text-muted-foreground">
                    {item.selectedOptions}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity} x{" "}
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency.toUpperCase(),
                  }).format(item.unitPrice / 100)}
                </p>
              </div>
              <p className="font-medium">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: order.currency.toUpperCase(),
                }).format((item.unitPrice * item.quantity) / 100)}
              </p>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-semibold">Order Summary</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency.toUpperCase(),
                  }).format(order.subtotal / 100)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2 font-medium">
                <dt>Total</dt>
                <dd>
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency.toUpperCase(),
                  }).format(order.total / 100)}
                </dd>
              </div>
            </dl>
          </div>

          {order.customerName && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Shipping</h3>
              <p className="text-sm">{order.customerName}</p>
              {order.addressLine1 && (
                <p className="text-sm text-muted-foreground">
                  {order.addressLine1}
                  {order.addressLine2 && <>, {order.addressLine2}</>}
                  <br />
                  {order.city}
                  {order.state && <>, {order.state}</>}
                  {order.postalCode && <> {order.postalCode}</>}
                  <br />
                  {order.country}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
