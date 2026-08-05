import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/db/schema";
import { getResolvedSiteId } from "@/lib/site-context";

export const revalidate = 300;

export const metadata: Metadata = { title: "Blog", description: "Latest news, stories, and updates." };

export default async function BlogPage() {
  const siteId = await getResolvedSiteId();
  const posts = siteId ? await db.select().from(blogPosts).where(and(eq(blogPosts.siteId, siteId), eq(blogPosts.published, true))).orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt)) : [];

  return <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6"><div className="mb-12 max-w-2xl"><p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">Latest updates</p><h1 className="font-heading text-4xl font-semibold sm:text-5xl">Blog</h1><p className="mt-4 text-muted-foreground">News, stories, and useful updates from our team.</p></div>{posts.length ? <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">{posts.map((post) => <article key={post.id} className="overflow-hidden rounded-xl border bg-card"><Link href={`/blog/${post.slug}`} className="block">{post.coverImage && <Image src={post.coverImage} alt="" width={800} height={450} unoptimized className="aspect-video w-full object-cover" />}<div className="p-6">{post.category && <p className="text-xs font-medium tracking-wider text-primary uppercase">{post.category}</p>}<h2 className="mt-2 font-heading text-2xl font-semibold">{post.title}</h2>{post.excerpt && <p className="mt-3 text-sm text-muted-foreground">{post.excerpt}</p>}<p className="mt-4 text-xs text-muted-foreground">{formatDate(post.publishedAt)}</p></div></Link></article>)}</div> : <p className="text-muted-foreground">No posts have been published yet.</p>}</div>;
}

function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(value)) : ""; }
