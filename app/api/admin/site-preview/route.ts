import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireActionRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { requireSiteAccess } from "@/lib/tenant-access";

export async function GET(request: NextRequest) {
  try {
    await requireActionRole("viewer");
    const siteId = Number(request.nextUrl.searchParams.get("siteId"));
    if (!Number.isInteger(siteId) || siteId < 1) {
      return NextResponse.json({ error: "Valid site ID required." }, { status: 400 });
    }

    await requireSiteAccess(siteId);
    const [site] = await db.select().from(sites).where(eq(sites.id, siteId));
    if (!site || !site.published) {
      return NextResponse.json({ error: "Published site not found." }, { status: 404 });
    }

    const destination = site.domain
      ? new URL(`https://${site.domain}`)
      : new URL(`/?site=${encodeURIComponent(site.slug)}`, request.url);
    const response = NextResponse.redirect(destination);
    if (!site.domain) {
      response.cookies.set("site_preview", site.slug, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
