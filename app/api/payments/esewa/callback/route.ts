import { createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptCommerceSecrets } from "@/lib/commerce/secrets";
import { orders, paymentConfigurations, settings, sites } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const encoded = request.nextUrl.searchParams.get("data");
  if (!encoded) return new NextResponse("Missing eSewa payment response.", { status: 400 });
  let payload: Record<string, string>;
  try { payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as Record<string, string>; } catch { return new NextResponse("Invalid eSewa payment response.", { status: 400 }); }
  const [order] = await db.select().from(orders).where(and(eq(orders.orderNumber, payload.transaction_uuid ?? ""), eq(orders.paymentProvider, "esewa"), eq(orders.status, "pending")));
  if (!order) return new NextResponse("Matching pending order not found.", { status: 404 });
  const [configuration, secretRow, site] = await Promise.all([
    db.select().from(paymentConfigurations).where(and(eq(paymentConfigurations.siteId, order.siteId), eq(paymentConfigurations.provider, "esewa"))).then((rows) => rows[0]),
    db.select({ value: settings.value }).from(settings).where(and(eq(settings.siteId, order.siteId), eq(settings.key, "commerce_payment_esewa_secrets"))).then((rows) => rows[0]),
    db.select({ slug: sites.slug }).from(sites).where(eq(sites.id, order.siteId)).then((rows) => rows[0]),
  ]);
  if (!configuration || !secretRow?.value || !site) return new NextResponse("eSewa configuration not found.", { status: 503 });
  const config = parseSettings(configuration.settings);
  const secrets = decryptCommerceSecrets(secretRow.value);
  const signedFields = payload.signed_field_names?.split(",") ?? [];
  const message = signedFields.map((field) => `${field}=${payload[field] ?? ""}`).join(",");
  const expected = createHmac("sha256", secrets.secretKey).update(message).digest("base64");
  const validSignature = payload.signature && Buffer.byteLength(expected) === Buffer.byteLength(payload.signature) && timingSafeEqual(Buffer.from(expected), Buffer.from(payload.signature));
  const expectedTotal = (order.total / 100).toFixed(2);
  const amountMatches = Number(payload.total_amount).toFixed(2) === expectedTotal;
  const isComplete = payload.status === "COMPLETE" && payload.product_code === config.merchantId && amountMatches && validSignature;
  if (isComplete) await db.update(orders).set({ status: "paid", paymentStatus: "paid", providerPaymentId: payload.transaction_code || `${config.mode}:${payload.transaction_uuid}`, updatedAt: new Date().toISOString() }).where(and(eq(orders.id, order.id), eq(orders.siteId, order.siteId)));
  const status = isComplete ? "success" : "failed";
  return NextResponse.redirect(new URL(`/?site=${encodeURIComponent(site.slug)}&payment=${status}&order=${encodeURIComponent(order.orderNumber)}`, request.url));
}

function parseSettings(raw: string | null) { try { const value = JSON.parse(raw ?? "{}") as Record<string, unknown>; return { merchantId: typeof value.merchantId === "string" ? value.merchantId : "", mode: value.mode === "live" ? "live" : "test" }; } catch { return { merchantId: "", mode: "test" }; } }
