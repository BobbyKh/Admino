"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { getCurrentSiteWithFeatureForRole } from "@/lib/tenant-access";
import { LAYOUT_SETTING_KEYS, type LayoutSettings } from "@/lib/layout-settings";

export async function updateLayoutSettings(formData: FormData) {
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole("layout", "admin");
  if (denied) throw new Error(denied);
  const value = Object.fromEntries(LAYOUT_SETTING_KEYS.map((key) => [key, formData.get(key) === "on"])) as LayoutSettings;
  await db.insert(settings).values({ siteId, key: "site_layout", value: JSON.stringify(value), updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: [settings.key, settings.siteId], set: { value: JSON.stringify(value), updatedAt: new Date().toISOString() } });
  revalidatePath("/", "layout");
  revalidatePath("/admin/layout");
}

export async function updateThemeCustomizerSettings(formData: FormData) {
  const { siteId, denied } = await getCurrentSiteWithFeatureForRole("layout", "admin");
  if (denied) throw new Error(denied);

  const fontBody = String(formData.get("fontBody") ?? "Inter").trim();
  const fontHeading = String(formData.get("fontHeading") ?? "Outfit").trim();
  const customCss = String(formData.get("customCss") ?? "").trim();

  const themeConfig = {
    fontBody,
    fontHeading,
    customCss,
    updatedAt: new Date().toISOString(),
  };

  await db.insert(settings).values({
    siteId,
    key: "site_theme_customizer",
    value: JSON.stringify(themeConfig),
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: [settings.key, settings.siteId],
    set: { value: JSON.stringify(themeConfig), updatedAt: new Date().toISOString() },
  });

  revalidatePath("/", "layout");
  revalidatePath("/admin/layout");
  return { success: true, message: "Theme customizer settings updated." };
}
