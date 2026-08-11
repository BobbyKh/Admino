import { redirect } from "next/navigation";
import { getSessionCustomer } from "@/lib/customer-auth";
import { getCustomerOrders } from "@/lib/actions/customers";
import { Package, Heart, MapPin } from "lucide-react";
import Link from "next/link";

export default async function AccountPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/account/login");

  const orders = await getCustomerOrders();
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const currency = orders[0]?.currency ?? "usd";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Welcome back, {customer.name}</h2>
        <p className="text-sm text-muted-foreground">
          Manage your account and view your orders.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/account/orders"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <Package className="mb-2 size-5 text-primary" />
          <p className="text-2xl font-bold">{totalOrders}</p>
          <p className="text-sm text-muted-foreground">Total Orders</p>
        </Link>
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: currency.toUpperCase(),
            }).format(totalSpent / 100)}
          </p>
        </div>
        <Link
          href="/account/addresses"
          className="rounded-lg border p-4 transition-colors hover:bg-muted"
        >
          <MapPin className="mb-2 size-5 text-primary" />
          <p className="text-sm font-medium">Manage Addresses</p>
          <p className="text-xs text-muted-foreground">Save addresses for faster checkout</p>
        </Link>
      </div>

      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-lg font-semibold">Account Details</h3>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Name</dt>
            <dd className="font-medium">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="font-medium">{customer.email}</dd>
          </div>
          {customer.phone && (
            <div>
              <dt className="text-sm text-muted-foreground">Phone</dt>
              <dd className="font-medium">{customer.phone}</dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-muted-foreground">Member since</dt>
            <dd className="font-medium">
              {new Date(customer.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
