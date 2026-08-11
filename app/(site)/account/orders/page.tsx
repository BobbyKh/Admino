import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionCustomer } from "@/lib/customer-auth";
import { getCustomerOrders } from "@/lib/actions/customers";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  paid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  fulfilled: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default async function OrdersPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/account/login");

  const orders = await getCustomerOrders();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Order History</h2>
        <p className="text-sm text-muted-foreground">
          View and track your orders.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border py-12 text-center">
          <p className="text-muted-foreground">No orders yet.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderNumber}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{order.orderNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <Badge className={STATUS_STYLES[order.status] ?? ""}>
                    {order.status}
                  </Badge>
                  <p className="mt-1 text-sm font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: order.currency.toUpperCase(),
                    }).format(order.total / 100)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
