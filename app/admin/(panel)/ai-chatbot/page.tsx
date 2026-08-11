import { redirect } from "next/navigation";
import { requireAdmin, type Role } from "@/lib/auth";
import { checkTenantFeature } from "@/lib/tenant-features";
import { getAdminSiteId } from "@/lib/admin-site";
import { getSiteSettings } from "@/lib/data";
import { AiRagManager } from "@/components/admin/ai-rag-manager";

export const dynamic = "force-dynamic";

export default async function AiRagPage() {
  const user = await requireAdmin();
  const siteId = await getAdminSiteId();
  const denied = await checkTenantFeature(siteId, "ai_chatbot_rag", {
    role: user.role as Role,
    userId: user.id,
  });
  if (denied) redirect("/admin");

  const settings = await getSiteSettings(siteId);

  return <AiRagManager ragEnabled={settings.aiRagEnabled === "true"} indexedAt={settings.aiRagIndexedAt || null} hasAiKey={settings.hasAiApiKey === "true"} />;
}
