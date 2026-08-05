import { BlogManager } from "@/components/admin/blog-manager";
import { listBlogPosts } from "@/lib/actions/blog";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  await requireRole("admin");
  return <BlogManager posts={await listBlogPosts()} />;
}
