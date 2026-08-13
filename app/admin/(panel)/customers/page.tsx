"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Trash2,
  Eye,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAdminCustomers,
  getAdminCustomer,
  getAdminCustomerStats,
  deleteAdminCustomer,
} from "@/lib/actions/admin-customers";
import { toast } from "sonner";
import { BulkExportScope, ExportRowCheckbox, ExportSelectAll } from "@/components/admin/bulk-export-scope";

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerDetail {
  customer: Customer;
  addresses: Array<{
    id: number;
    label: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string | null;
    country: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: number;
    orderNumber: string;
    total: number;
    currency: string;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  wishlist: Array<{
    id: number;
    product: {
      id: number;
      title: string;
      slug: string;
      image: string | null;
      price: number;
    };
  }>;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const [customersData, statsData] = await Promise.all([
      getAdminCustomers(),
      getAdminCustomerStats(),
    ]);
    setCustomers(customersData);
    setStats(statsData);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  async function handleSearch() {
    setLoading(true);
    const data = await getAdminCustomers(search || undefined);
    setCustomers(data);
    setLoading(false);
  }

  async function handleView(customerId: number) {
    setViewLoading(true);
    const data = await getAdminCustomer(customerId);
    setSelectedCustomer(data);
    setViewLoading(false);
  }

  async function handleDelete(customerId: number) {
    const result = await deleteAdminCustomer(customerId);
    if (result.success) {
      toast.success(result.message);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      setSelectedCustomer(null);
      setStats((prev) => ({ ...prev, total: prev.total - 1 }));
    } else {
      toast.error(result.message);
    }
  }

  function formatCurrency(amount: number, currency: string = "usd") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage customer accounts and view their activity.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card><CardHeader className="pb-2">
            <CardDescription>New This Month</CardDescription>
            <CardTitle className="text-2xl">{stats.thisMonth}</CardTitle>
          </CardHeader>
        </Card>
        <Card><CardHeader className="pb-2">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-2xl">{stats.totalOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(stats.totalRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
      </div>

      {selectedCustomer ? (
        <CustomerDetail
          data={selectedCustomer}
          loading={viewLoading}
          onBack={() => setSelectedCustomer(null)}
          onDelete={handleDelete}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
        />
      ) : (
        <BulkExportScope rows={customers} filename="customers.csv"><Card>
          {customers.length > 0 && <div className="flex items-center gap-2 border-b p-4"><ExportSelectAll /><span className="text-sm text-muted-foreground">Select all customers</span></div>}
          <CardContent className="p-0">
            <div className="divide-y">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No customers found.</p>
                </div>
              ) : (
                customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50"
                  >
                    <ExportRowCheckbox id={customer.id} label={`Select ${customer.name}`} />
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(customer.createdAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(customer.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card></BulkExportScope>
      )}
    </div>
  );
}

function CustomerDetail({
  data,
  loading,
  onBack,
  onDelete,
  formatDate,
  formatCurrency,
}: {
  data: CustomerDetail | null;
  loading: boolean;
  onBack: () => void;
  onDelete: (id: number) => void;
  formatDate: (d: string) => string;
  formatCurrency: (a: number, c?: string) => string;
}) {
  if (loading || !data) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading customer details...
        </CardContent>
      </Card>
    );
  }

  const { customer, addresses, orders, wishlist } = data;

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{customer.name}</CardTitle>
              <CardDescription>{customer.email}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(customer.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold">Contact Info</h3>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {customer.email}
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {customer.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Joined {formatDate(customer.createdAt)}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Addresses ({addresses.length})</h3>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No addresses saved.
                </p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="text-sm border rounded-md p-2 space-y-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{addr.label}</span>
                      {addr.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ""}
                      <br />
                      {addr.city}
                      {addr.state ? `, ${addr.state}` : ""}{" "}
                      {addr.postalCode ?? ""}
                      <br />
                      {addr.country}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">
              <ShoppingBag className="inline h-4 w-4 mr-1" />
              Orders ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="border rounded-md divide-y">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 text-sm"
                  >
                    <div>
                      <span className="font-mono">{order.orderNumber}</span>
                      <span className="ml-2 text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          order.status === "paid" ? "default" : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                      <span className="font-medium">
                        {formatCurrency(order.total, order.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="font-semibold">
              Wishlist ({wishlist.length})
            </h3>
            {wishlist.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wishlist items.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-3">
                {wishlist.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-md p-3 text-sm"
                  >
                    <p className="font-medium">{item.product.title}</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
