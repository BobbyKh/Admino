import { NextResponse } from "next/server";
import { getResolvedSiteSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getResolvedSiteSettings();
  const icon = settings.favicon || settings.logo;

  if (icon) {
    return NextResponse.redirect(icon, { status: 307 });
  }

  const initial = (settings.siteName || "A").trim().charAt(0).toUpperCase() || "A";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#166534"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="34" font-weight="700" fill="white">${initial.replace(/[<>&"]/g, "")}</text></svg>`;
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
