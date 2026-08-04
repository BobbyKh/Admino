import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, sites } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("order");
  if (!orderNumber) return NextResponse.redirect(new URL("/", request.url));
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  if (!order) return NextResponse.redirect(new URL("/", request.url));
  const [site] = await db.select({ slug: sites.slug }).from(sites).where(eq(sites.id, order.siteId));
  return NextResponse.redirect(new URL(`/?site=${encodeURIComponent(site?.slug ?? "")}&payment=failed&order=${encodeURIComponent(orderNumber)}`, request.url));
}
