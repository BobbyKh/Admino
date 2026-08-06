"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getCurrentSiteWithFeature } from "@/lib/tenant-access";
import { LAYOUT_SETTING_KEYS, type LayoutSettings } from "@/lib/layout-settings";

export async function updateLayoutSettings(formData: FormData) {
  const { siteId, denied } = await getCurrentSiteWithFeature("layout");
  if (denied) throw new Error(denied);
  const value = Object.fromEntries(LAYOUT_SETTING_KEYS.map((key) => [key, formData.get(key) === "on"])) as LayoutSettings;
  await db.insert(settings).values({ siteId, key: "site_layout", value: JSON.stringify(value), updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [settings.key, settings.siteId], set: { value: JSON.stringify(value), updatedAt: new Date().toISOString() } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/layout");
}
