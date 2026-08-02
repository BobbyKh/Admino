"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { SETTING_KEYS } from "@/lib/settings";
import { getAdminSiteId } from "@/lib/admin-site";
import type { AdminActionState } from "./types";

export async function updateSettings(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const now = new Date().toISOString();
  for (const key of SETTING_KEYS) {
    const value = formData.get(key);
    if (typeof value !== "string") continue;
    await db
      .insert(settings)
      .values({ key, siteId, value, updatedAt: now })
      .onConflictDoUpdate({
        target: [settings.key, settings.siteId],
        set: { value, updatedAt: now },
      });
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  return { success: true, message: "Settings saved." };
}
