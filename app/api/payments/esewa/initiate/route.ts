import { createHmac } from "crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptCommerceSecrets } from "@/lib/commerce/secrets";
import { orders, paymentConfigurations, settings } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("order");
  if (!orderNumber) return new NextResponse("Order is required.", { status: 400 });
  const [order] = await db.select().from(orders).where(and(eq(orders.orderNumber, orderNumber), eq(orders.paymentProvider, "esewa"), eq(orders.status, "pending")));
  if (!order) return new NextResponse("Pending eSewa order not found.", { status: 404 });
  const [configuration, secretRow] = await Promise.all([
    db.select().from(paymentConfigurations).where(and(eq(paymentConfigurations.siteId, order.siteId), eq(paymentConfigurations.provider, "esewa"), eq(paymentConfigurations.enabled, true))).then((rows) => rows[0]),
    db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, order.siteId), eq(settings.key, "commerce_payment_esewa_secrets"))).then((rows) => rows[0]),
  ]);
  if (!configuration || !secretRow?.value) return new NextResponse("eSewa is not configured for this store.", { status: 503 });
  const config = parseSettings(configuration.settings);
  let secrets: Record<string, string>;
  try {
    secrets = decryptCommerceSecrets(secretRow.value);
  } catch (error) {
    console.error("Unable to decrypt eSewa credentials.", { siteId: order.siteId, errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("eSewa credentials are temporarily unavailable.", { status: 503 });
  }
  if (!config.merchantId || !secrets.secretKey) return new NextResponse("eSewa service code and signing key are required.", { status: 503 });
  if (config.mode === "live" && !secrets.clientSecret) return new NextResponse("Live eSewa client secret is required.", { status: 503 });
  const amount = (order.subtotal / 100).toFixed(2);
  const totalAmount = (order.total / 100).toFixed(2);
  const hostHeaders = await headers();
  const protocol = hostHeaders.get("x-forwarded-proto") ?? "http";
  const host = hostHeaders.get("x-forwarded-host") ?? hostHeaders.get("host");
  if (!host) return new NextResponse("Unable to determine callback URL.", { status: 500 });
  const origin = `${protocol}://${host}`;
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const message = `total_amount=${totalAmount},transaction_uuid=${order.orderNumber},product_code=${config.merchantId}`;
  const signature = createHmac("sha256", secrets.secretKey).update(message).digest("base64");
  const fields: Record<string, string> = { amount, tax_amount: "0", total_amount: totalAmount, transaction_uuid: order.orderNumber, product_code: config.merchantId, product_service_charge: "0", product_delivery_charge: "0", success_url: `${origin}/api/payments/esewa/callback`, failure_url: `${origin}/api/payments/esewa/failure?order=${encodeURIComponent(order.orderNumber)}`, signed_field_names: signedFieldNames, signature };
  const inputs = Object.entries(fields).map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`).join("");
  const endpoint = config.mode === "live" ? "https://epay.esewa.com.np/api/epay/main/v2/form" : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
  return new NextResponse(`<!doctype html><html><body><form id="payment" action="${endpoint}" method="POST">${inputs}</form><script>document.getElementById('payment').submit()</script></body></html>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

function parseSettings(raw: string | null) { try { const value = JSON.parse(raw ?? "{}") as Record<string, unknown>; return { merchantId: typeof value.merchantId === "string" ? value.merchantId : "", mode: value.mode === "live" ? "live" : "test" }; } catch { return { merchantId: "", mode: "test" }; } }
function escapeHtml(value: string) { return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character); }
