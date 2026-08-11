import { listBlogPosts } from "@/lib/actions/blog";
import { requireRole } from "@/lib/auth";
import { BlogManagerWrapper } from "./blog-manager-wrapper";

export const dynamic = "force-dynamic";

export default async function BlogAdminPage() {
  await requireRole("admin");
  const posts = await listBlogPosts();
  return <BlogManagerWrapper posts={posts} />;
}
