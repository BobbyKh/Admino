import { requireAdmin } from "@/lib/auth";
import { DocsHub } from "@/components/admin/docs-hub";

export const dynamic = "force-dynamic";

export default async function DocsPage() {
  await requireAdmin();
  return <DocsHub />;
}
