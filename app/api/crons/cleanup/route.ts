import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredRateLimitBuckets } from "@/lib/rate-limit";

export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await deleteExpiredRateLimitBuckets();
  return NextResponse.json({ ok: true });
}
