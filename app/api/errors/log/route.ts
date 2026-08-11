import { NextRequest, NextResponse } from "next/server";
import { logError } from "@/lib/error-tracking";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      message?: string;
      stack?: string;
      level?: string;
      url?: string;
      method?: string;
      statusCode?: number;
      context?: Record<string, unknown>;
      digest?: string;
    };

    if (!body.message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent") ?? undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? undefined;

    await logError({
      level: (body.level as "error" | "warning" | "info") ?? "error",
      message: body.digest ? `${body.message} [digest: ${body.digest}]` : body.message,
      stack: body.stack,
      url: body.url,
      method: body.method,
      statusCode: body.statusCode,
      userAgent,
      ipAddress,
      context: body.context,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
