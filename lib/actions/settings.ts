"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { SETTING_KEYS } from "@/lib/settings";
import { getCurrentSiteWithFeature } from "@/lib/tenant-access";
import { sendTestEmail } from "@/lib/email";
import type { AdminActionState } from "./types";

export async function updateSettings(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { siteId, denied } = await getCurrentSiteWithFeature("settings");
  if (denied) return { message: denied };
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

export async function sendTestEmailAction(email: string) {
  const { siteId, denied } = await getCurrentSiteWithFeature("settings");
  if (denied) return { success: false, message: denied };

  const targetEmail = email.trim();
  if (!targetEmail || !targetEmail.includes("@")) {
    return { success: false, message: "Enter a valid recipient email address." };
  }

  const result = await sendTestEmail(targetEmail);
  if (result.skipped) {
    return {
      success: true,
      message: `Test email logged to server console (SMTP not configured for ${targetEmail}).`,
    };
  }

  return { success: true, message: `Test email sent successfully to ${targetEmail}.` };
}
