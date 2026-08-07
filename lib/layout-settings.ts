import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export type LayoutSettings = { headerVisible: boolean; headerSticky: boolean; headerShowLogo: boolean; headerShowSiteName: boolean; headerShowCart: boolean; footerVisible: boolean; footerShowBrand: boolean; footerShowNavigation: boolean; footerShowContact: boolean; footerShowHours: boolean };
const defaults: LayoutSettings = { headerVisible: true, headerSticky: true, headerShowLogo: true, headerShowSiteName: true, headerShowCart: true, footerVisible: true, footerShowBrand: true, footerShowNavigation: true, footerShowContact: true, footerShowHours: true };
const keys = Object.keys(defaults) as (keyof LayoutSettings)[];

export async function getLayoutSettings(siteId: number): Promise<LayoutSettings> {
  const rows = await db.select().from(settings).where(and(eq(settings.siteId, siteId), eq(settings.key, "site_layout")));
  try { return { ...defaults, ...(rows[0] ? JSON.parse(rows[0].value) : {}) }; } catch { return defaults; }
}

export { defaults as DEFAULT_LAYOUT_SETTINGS, keys as LAYOUT_SETTING_KEYS };
