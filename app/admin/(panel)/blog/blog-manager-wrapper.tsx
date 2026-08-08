"use client";

import dynamic from "next/dynamic";

const BlogManager = dynamic(
  () => import("@/components/admin/blog-manager").then((m) => m.BlogManager),
  { ssr: false, loading: () => <div className="space-y-4"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded-lg bg-muted" /></div> }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BlogManagerWrapper({ posts }: { posts: any }) {
  return <BlogManager posts={posts} />;
}
