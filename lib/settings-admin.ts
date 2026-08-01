import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { DEFAULT_SETTINGS, type SettingKey } from "@/lib/settings";

export async function getSettingsRows() {
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const merged: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const v = map.get(key as SettingKey);
    if (v !== undefined) merged[key] = v;
  }
  return merged as Record<SettingKey, string>;
}
