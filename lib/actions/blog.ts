"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";

const blogPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  excerpt: z.string().trim().max(500).optional().default(""),
  content: z.string().trim().min(1, "Content is required.").max(100_000),
  coverImage: z.string().trim().url().optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().default(""),
  published: z.boolean(),
  publishedAt: z.string().trim().optional().default(""),
});

async function getBlogSiteId() {
  await requireRole("admin");
  return getCurrentAdminSiteId();
}

function blogPostInput(formData: FormData) {
  const parsed = blogPostSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    excerpt: formData.get("excerpt") ?? "",
    content: formData.get("content") ?? "",
    coverImage: formData.get("coverImage") ?? "",
    category: formData.get("category") ?? "",
    published: formData.get("published") === "on",
    publishedAt: formData.get("publishedAt") ?? "",
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid blog post.");

  const publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null;
  if (publishedAt && Number.isNaN(publishedAt.getTime())) throw new Error("Published date is invalid.");
  return { ...parsed.data, publishedAt: publishedAt?.toISOString() ?? null };
}

function revalidateBlog() {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/sitemap.xml");
}

export async function listBlogPosts() {
  const siteId = await getBlogSiteId();
  return db.select().from(blogPosts).where(eq(blogPosts.siteId, siteId)).orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
}

export async function createBlogPost(formData: FormData) {
  const siteId = await getBlogSiteId();
  const post = blogPostInput(formData);
  const now = new Date().toISOString();
  await db.insert(blogPosts).values({
    siteId,
    ...post,
    excerpt: post.excerpt || null,
    coverImage: post.coverImage || null,
    category: post.category || null,
    publishedAt: post.published ? post.publishedAt ?? now : null,
    updatedAt: now,
  });
  revalidateBlog();
}

export async function updateBlogPost(postId: number, formData: FormData) {
  const siteId = await getBlogSiteId();
  if (!Number.isInteger(postId) || postId < 1) throw new Error("Invalid blog post.");
  const post = blogPostInput(formData);
  const [existing] = await db.select({ publishedAt: blogPosts.publishedAt }).from(blogPosts)
    .where(and(eq(blogPosts.id, postId), eq(blogPosts.siteId, siteId)));
  if (!existing) throw new Error("Blog post not found.");
  await db.update(blogPosts).set({
    ...post,
    excerpt: post.excerpt || null,
    coverImage: post.coverImage || null,
    category: post.category || null,
    publishedAt: post.published ? post.publishedAt ?? existing.publishedAt ?? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  }).where(and(eq(blogPosts.id, postId), eq(blogPosts.siteId, siteId)));
  revalidateBlog();
}

export async function deleteBlogPost(postId: number) {
  const siteId = await getBlogSiteId();
  if (!Number.isInteger(postId) || postId < 1) throw new Error("Invalid blog post.");
  await db.delete(blogPosts).where(and(eq(blogPosts.id, postId), eq(blogPosts.siteId, siteId)));
  revalidateBlog();
}
