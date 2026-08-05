import type { Metadata } from "next";
import Image from "next/image";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { sanitizeHtml } from "@/lib/sanitize";
import { getResolvedSiteId } from "@/lib/site-context";

export const revalidate = 300;

async function getPublishedPost(slug: string) {
  const siteId = await getResolvedSiteId();
  if (!siteId) return null;
  const [post] = await db.select().from(blogPosts).where(and(eq(blogPosts.siteId, siteId), eq(blogPosts.slug, slug), eq(blogPosts.published, true)));
  return post ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt || undefined, openGraph: { title: post.title, description: post.excerpt || undefined, type: "article", publishedTime: post.publishedAt || undefined, images: post.coverImage ? [{ url: post.coverImage }] : undefined } };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();
  return <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><header className="mb-10">{post.category && <p className="text-sm font-medium tracking-widest text-primary uppercase">{post.category}</p>}<h1 className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">{post.title}</h1>{post.excerpt && <p className="mt-5 text-lg text-muted-foreground">{post.excerpt}</p>}{post.publishedAt && <time dateTime={post.publishedAt} className="mt-5 block text-sm text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(post.publishedAt))}</time>}</header>{post.coverImage && <Image src={post.coverImage} alt="" width={1200} height={675} unoptimized className="mb-10 aspect-video w-full rounded-xl object-cover" />}<div className="prose prose-neutral max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} /></article>;
}
