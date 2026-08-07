"use client";

import * as React from "react";
import { Check, Download, PackageCheck, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { approveOrderPayment, fulfillOrder, rejectOrderPayment } from "@/lib/actions/index";
import type { Order } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function OrdersManager({ orders }: { orders: Order[] }) {
  const [pending, startTransition] = React.useTransition();
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const paidSales = paidOrders.reduce((total, order) => total + order.total, 0);
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const deliveredOrders = orders.filter((order) => order.status === "fulfilled").length;

  function run(order: Order, action: "approve" | "reject" | "fulfill") {
    startTransition(async () => {
      try {
        if (action === "approve") await approveOrderPayment(order.id);
        if (action === "reject") await rejectOrderPayment(order.id);
        if (action === "fulfill") await fulfillOrder(order.id);
        toast.success(action === "approve" ? "Payment approved. Order is ready for delivery." : action === "reject" ? "Payment rejected and inventory restored." : "Order marked delivered.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to update order.");
      }
    });
  }

  function exportOrders() {
    const rows = [
      ["Order", "Name", "Email", "Phone", "Address", "Currency", "Total", "Payment via", "Payment status", "Fulfillment", "Reference", "Notes", "Created"],
      ...orders.map((order) => [
        order.orderNumber,
        order.customerName ?? "",
        order.email,
        order.phone ?? "",
        addressLine(order),
        order.currency.toUpperCase(),
        String(order.total),
        paymentProviderLabel(order.paymentProvider),
        paymentLabel(order.paymentStatus),
        statusLabel(order.status),
        order.providerPaymentId ?? "",
        order.deliveryNotes ?? "",
        order.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="font-heading text-3xl font-semibold">Orders</h1><p className="mt-1 text-sm text-muted-foreground">Verify payments, confirm orders, and track delivery for the active site.</p></div>
        <Button variant="outline" size="sm" onClick={exportOrders} disabled={orders.length === 0}><Download className="mr-2 size-4" />Export CSV</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Paid sales" value={formatTotal(paidSales, paidOrders[0]?.currency ?? "usd")} description={`${paidOrders.length} paid order${paidOrders.length === 1 ? "" : "s"}`} />
        <SummaryCard label="Awaiting action" value={String(pendingOrders)} description="Payment review required" />
        <SummaryCard label="Delivered" value={String(deliveredOrders)} description="Orders fulfilled" />
      </div>
      <Card>
        <CardHeader className="flex-row items-center gap-3"><ShoppingBag className="size-4 text-primary" /><div><CardTitle className="font-heading">Order operations</CardTitle><CardDescription>{orders.length} order{orders.length === 1 ? "" : "s"} for this tenant.</CardDescription></div></CardHeader>
        <CardContent className="px-0 pb-0">
          {orders.length === 0 ? <p className="m-6 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">No orders yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Delivery</TableHead><TableHead>Payment via</TableHead><TableHead>Payment</TableHead><TableHead>Fulfillment</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Operations</TableHead></TableRow></TableHeader>
              <TableBody>{orders.map((order) => <TableRow key={order.id}><TableCell className="font-medium">{order.orderNumber}<p className="mt-1 text-xs font-normal text-muted-foreground">{formatTotal(order.total, order.currency)}</p></TableCell><TableCell><p>{order.customerName || order.email}</p><p className="text-xs text-muted-foreground">{order.email}</p>{order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}</TableCell><TableCell className="max-w-64"><p className="text-sm">{addressLine(order) || "-"}</p>{order.deliveryNotes && <p className="mt-1 text-xs text-muted-foreground">{order.deliveryNotes}</p>}</TableCell><TableCell>{paymentProviderLabel(order.paymentProvider)}</TableCell><TableCell><Badge variant={order.paymentStatus === "paid" ? "default" : order.paymentStatus === "failed" ? "destructive" : "secondary"}>{paymentLabel(order.paymentStatus)}</Badge></TableCell><TableCell><Badge variant={order.status === "fulfilled" ? "default" : "secondary"}>{statusLabel(order.status)}</Badge></TableCell><TableCell className="max-w-40 truncate text-xs text-muted-foreground">{order.providerPaymentId ?? "-"}</TableCell><TableCell><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" disabled={pending || !["awaiting_verification", "payment_pending"].includes(order.paymentStatus)} onClick={() => run(order, "approve")} title="Approve payment"><Check className="size-4" /></Button><Button size="icon-sm" variant="ghost" className="text-destructive" disabled={pending || order.paymentStatus === "failed" || order.status === "cancelled"} onClick={() => run(order, "reject")} title="Reject payment"><X className="size-4" /></Button><Button size="icon-sm" variant="ghost" disabled={pending || order.paymentStatus !== "paid" || order.status === "fulfilled"} onClick={() => run(order, "fulfill")} title="Mark delivered"><PackageCheck className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function addressLine(order: Order) {
  return [order.addressLine1, order.addressLine2, order.city, order.state, order.postalCode, order.country].filter(Boolean).join(", ");
}
function paymentLabel(status: string) { if (status === "awaiting_verification") return "Reference submitted"; if (status === "payment_pending") return "Awaiting provider"; if (status === "paid") return "Approved"; if (status === "failed") return "Rejected"; return status; }
function statusLabel(status: string) { if (status === "paid") return "Confirmed"; if (status === "fulfilled") return "Delivered"; return status; }
function paymentProviderLabel(provider: string | null) { if (!provider) return "-"; return provider === "qr" ? "QR payment" : provider === "esewa" ? "eSewa" : provider.charAt(0).toUpperCase() + provider.slice(1); }
function formatTotal(total: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(total / 100); }
function SummaryCard({ label, value, description }: { label: string; value: string; description: string }) { return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-heading text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></CardContent></Card>; }
