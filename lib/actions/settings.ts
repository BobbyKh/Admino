"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SETTING_KEYS } from "@/lib/settings";
import { requireSiteFeatureForRole } from "@/lib/tenant-access";
import { sendTestEmail } from "@/lib/email";
import type { AdminActionState } from "./types";

export async function updateSettings(
  siteId: number,
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSiteFeatureForRole(siteId, "settings", "admin");
  } catch (error) {
    return { message: error instanceof Error ? error.message : "Forbidden" };
  }
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

export async function sendTestEmailAction(siteId: number, email: string) {
  try {
    await requireSiteFeatureForRole(siteId, "settings", "admin");
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Forbidden" };
  }

  const targetEmail = email.trim();
  if (!targetEmail || !targetEmail.includes("@")) {
    return { success: false, message: "Enter a valid recipient email address." };
  }

  const result = await sendTestEmail(siteId, targetEmail);
  if (result.skipped) {
    return {
      success: true,
      message: `Test email logged to server console (SMTP not configured for ${targetEmail}).`,
    };
  }

  return { success: true, message: `Test email sent successfully to ${targetEmail}.` };
}
