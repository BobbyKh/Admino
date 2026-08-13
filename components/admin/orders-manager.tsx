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
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";

export function OrdersManager({ orders }: { orders: Order[] }) {
  const siteId = useAdminSiteId();
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
      <BulkSelectionScope siteId={siteId} entity="orders" ids={orders.map((item) => item.id)} options={[{ value: "fulfill", label: "Mark paid orders delivered" }]}><Card>
        <CardHeader className="flex-row items-center gap-3"><ShoppingBag className="size-4 text-primary" /><div><CardTitle className="font-heading">Order operations</CardTitle><CardDescription>{orders.length} order{orders.length === 1 ? "" : "s"} for this tenant.</CardDescription></div></CardHeader>
        <CardContent className="px-0 pb-0">
          {orders.length === 0 ? <p className="m-6 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">No orders yet.</p> : (
            <>
              <div className="flex items-center gap-2 border-b px-4 py-3 md:hidden"><BulkSelectAll /><span className="text-sm text-muted-foreground">Select all visible orders</span></div>
              <div className="divide-y md:hidden">
                {orders.map((order) => (
                  <article key={order.id} className="space-y-4 p-4">
                    <BulkRowCheckbox id={order.id} label={`Select ${order.orderNumber}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{formatTotal(order.total, order.currency)}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={order.paymentStatus === "paid" ? "default" : order.paymentStatus === "failed" ? "destructive" : "secondary"}>{paymentLabel(order.paymentStatus, order.paymentProvider)}</Badge>
                        <Badge variant={order.status === "fulfilled" ? "default" : "secondary"}>{statusLabel(order.status)}</Badge>
                      </div>
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Customer</dt><dd className="truncate font-medium">{order.customerName || order.email}</dd><dd className="break-all text-xs text-muted-foreground">{order.email}</dd>{order.phone && <dd className="text-xs text-muted-foreground">{order.phone}</dd>}</div>
                      <div><dt className="text-xs font-medium text-muted-foreground">Delivery</dt><dd className="break-words">{addressLine(order) || "-"}</dd>{order.deliveryNotes && <dd className="mt-1 break-words text-xs text-muted-foreground">{order.deliveryNotes}</dd>}</div>
                      <div><dt className="text-xs font-medium text-muted-foreground">Payment via</dt><dd>{paymentProviderLabel(order.paymentProvider)}</dd></div>
                      <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Reference</dt><dd className="break-all text-xs text-muted-foreground">{order.providerPaymentId ?? "-"}</dd></div>
                    </dl>
                    <OrderActions order={order} pending={pending} onAction={run} labeled />
                  </article>
                ))}
              </div>
              <div className="hidden md:block">
                <Table className="min-w-[1120px] table-fixed">
                  <TableHeader><TableRow><TableHead className="w-10"><BulkSelectAll /></TableHead><TableHead className="w-32">Order</TableHead><TableHead className="w-56">Customer</TableHead><TableHead className="w-72">Delivery</TableHead><TableHead className="w-32">Payment via</TableHead><TableHead className="w-40">Payment</TableHead><TableHead className="w-32">Fulfillment</TableHead><TableHead className="w-44">Reference</TableHead><TableHead className="w-32 text-right">Operations</TableHead></TableRow></TableHeader>
                  <TableBody>{orders.map((order) => <TableRow key={order.id}><TableCell><BulkRowCheckbox id={order.id} label={`Select ${order.orderNumber}`} /></TableCell><TableCell className="font-medium">{order.orderNumber}<p className="mt-1 text-xs font-normal text-muted-foreground">{formatTotal(order.total, order.currency)}</p></TableCell><TableCell><div className="min-w-0"><p className="truncate">{order.customerName || order.email}</p><p className="truncate text-xs text-muted-foreground">{order.email}</p>{order.phone && <p className="truncate text-xs text-muted-foreground">{order.phone}</p>}</div></TableCell><TableCell className="whitespace-normal"><p className="break-words text-sm">{addressLine(order) || "-"}</p>{order.deliveryNotes && <p className="mt-1 line-clamp-2 break-words text-xs text-muted-foreground">{order.deliveryNotes}</p>}</TableCell><TableCell>{paymentProviderLabel(order.paymentProvider)}</TableCell><TableCell><Badge variant={order.paymentStatus === "paid" ? "default" : order.paymentStatus === "failed" ? "destructive" : "secondary"}>{paymentLabel(order.paymentStatus, order.paymentProvider)}</Badge></TableCell><TableCell><Badge variant={order.status === "fulfilled" ? "default" : "secondary"}>{statusLabel(order.status)}</Badge></TableCell><TableCell><span className="block truncate text-xs text-muted-foreground" title={order.providerPaymentId ?? undefined}>{order.providerPaymentId ?? "-"}</span></TableCell><TableCell><OrderActions order={order} pending={pending} onAction={run} /></TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card></BulkSelectionScope>
    </div>
  );
}

function OrderActions({ order, pending, onAction, labeled = false }: { order: Order; pending: boolean; onAction: (order: Order, action: "approve" | "reject" | "fulfill") => void; labeled?: boolean }) {
  return <div className={labeled ? "grid grid-cols-3 gap-2" : "flex justify-end gap-1"}><Button size={labeled ? "sm" : "icon-sm"} variant="ghost" disabled={pending || !["awaiting_verification", "payment_pending"].includes(order.paymentStatus)} onClick={() => onAction(order, "approve")} aria-label="Approve payment" title="Approve payment"><Check className="size-4" />{labeled && <span>Approve</span>}</Button><Button size={labeled ? "sm" : "icon-sm"} variant="ghost" className="text-destructive" disabled={pending || order.paymentStatus === "failed" || order.status === "cancelled"} onClick={() => onAction(order, "reject")} aria-label="Reject payment" title="Reject payment"><X className="size-4" />{labeled && <span>Reject</span>}</Button><Button size={labeled ? "sm" : "icon-sm"} variant="ghost" disabled={pending || order.paymentStatus !== "paid" || order.status === "fulfilled"} onClick={() => onAction(order, "fulfill")} aria-label="Mark delivered" title="Mark delivered"><PackageCheck className="size-4" />{labeled && <span>Deliver</span>}</Button></div>;
}

function addressLine(order: Order) {
  return [order.addressLine1, order.addressLine2, order.city, order.state, order.postalCode, order.country].filter(Boolean).join(", ");
}
function paymentLabel(status: string, provider?: string | null) { if (status === "awaiting_verification") return "Reference submitted"; if (status === "payment_pending") return provider === "cod" ? "Collect on delivery" : "Awaiting provider"; if (status === "paid") return "Approved"; if (status === "failed") return "Rejected"; return status; }
function statusLabel(status: string) { if (status === "paid") return "Confirmed"; if (status === "fulfilled") return "Delivered"; return status; }
function paymentProviderLabel(provider: string | null) { if (!provider) return "-"; return provider === "qr" ? "QR payment" : provider === "esewa" ? "eSewa" : provider === "cod" ? "Cash on delivery" : provider.charAt(0).toUpperCase() + provider.slice(1); }
function formatTotal(total: number, currency: string) { return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(total / 100); }
function SummaryCard({ label, value, description }: { label: string; value: string; description: string }) { return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-heading text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></CardContent></Card>; }
