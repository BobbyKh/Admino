"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createBlogPost, deleteBlogPost, updateBlogPost } from "@/lib/actions/blog";
import type { BlogPost } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/admin/media-picker";

export function BlogManager({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState("");
  const [editingPost, setEditingPost] = React.useState<BlogPost | null | undefined>(undefined);
  const visiblePosts = posts.filter((post) => `${post.title} ${post.slug} ${post.category ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  function savePost(formData: FormData) {
    startTransition(async () => {
      try {
        if (editingPost) await updateBlogPost(editingPost.id, formData);
        else await createBlogPost(formData);
        toast.success(editingPost ? "Post updated." : "Post created.");
        setEditingPost(undefined);
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save post."); }
    });
  }

  function removePost(post: BlogPost) {
    if (!window.confirm(`Delete ${post.title}? This cannot be undone.`)) return;
    startTransition(async () => {
      try { await deleteBlogPost(post.id); toast.success("Post deleted."); router.refresh(); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete post."); }
    });
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-3xl font-semibold">Blog</h1><p className="mt-1 text-sm text-muted-foreground">Write and publish posts for the active site.</p></div><Button onClick={() => setEditingPost(null)}><Plus className="mr-2 size-4" />Add post</Button></div>
    <Card><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="font-heading">All posts</CardTitle><CardDescription>{posts.length} post{posts.length === 1 ? "" : "s"} on this site.</CardDescription></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts" className="pl-9" /></div></CardHeader><CardContent className="px-0 pb-0">
      {visiblePosts.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><FileText className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{posts.length === 0 ? "No posts yet. Create your first post." : "No posts match your search."}</p>{posts.length === 0 && <Button size="sm" onClick={() => setEditingPost(null)}>Add post</Button>}</div> : <Table><TableHeader><TableRow><TableHead>Post</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Published</TableHead><TableHead className="w-28 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visiblePosts.map((post) => <TableRow key={post.id}><TableCell><div className="flex items-center gap-3">{post.coverImage ? <Image src={post.coverImage} alt="" width={36} height={36} unoptimized className="size-9 rounded-md border object-cover" /> : <div className="flex size-9 items-center justify-center rounded-md bg-muted"><FileText className="size-4 text-muted-foreground" /></div>}<div className="min-w-0"><p className="truncate font-medium">{post.title}</p><p className="truncate text-xs text-muted-foreground">/blog/{post.slug}</p></div></div></TableCell><TableCell>{post.category ?? <span className="text-muted-foreground">Uncategorized</span>}</TableCell><TableCell><Badge variant={post.published ? "default" : "secondary"}>{post.published ? "Published" : "Draft"}</Badge></TableCell><TableCell>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : <span className="text-muted-foreground">-</span>}</TableCell><TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setEditingPost(post)} aria-label={`Edit ${post.title}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => removePost(post)} aria-label={`Delete ${post.title}`}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></Card>
    <Dialog open={editingPost !== undefined} onOpenChange={(open) => !open && setEditingPost(undefined)}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><form onSubmit={(event) => { event.preventDefault(); savePost(new FormData(event.currentTarget)); }}><DialogHeader><DialogTitle>{editingPost ? "Edit post" : "Add post"}</DialogTitle><DialogDescription>Content accepts HTML and is sanitized before publication.</DialogDescription></DialogHeader><div className="grid gap-4 py-5 md:grid-cols-2"><BlogPostFields key={editingPost?.id ?? "new"} post={editingPost ?? undefined} /></div><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{editingPost ? "Save changes" : "Create post"}</Button></DialogFooter></form></DialogContent></Dialog>
  </div>;
}

function BlogPostFields({ post }: { post?: BlogPost }) {
  const [coverImage, setCoverImage] = React.useState(post?.coverImage ?? "");
  return <><Field label="Title" name="title" required defaultValue={post?.title} /><Field label="Slug" name="slug" required defaultValue={post?.slug} placeholder="for-example" /><Field label="Category" name="category" defaultValue={post?.category ?? ""} placeholder="For example, News" /><Field label="Published at" name="publishedAt" type="datetime-local" defaultValue={toLocalDateTime(post?.publishedAt)} /><div className="md:col-span-2"><Label htmlFor="excerpt">Excerpt</Label><Textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt ?? ""} rows={3} className="mt-2" /></div><div className="md:col-span-2"><Label htmlFor="content">Content HTML</Label><Textarea id="content" name="content" defaultValue={post?.content ?? ""} rows={14} required className="mt-2 font-mono text-xs" /></div><div className="md:col-span-2 rounded-lg border bg-muted/20 p-4"><MediaPicker name="coverImage" label="Cover image" value={coverImage} onChange={setCoverImage} /></div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name="published" defaultChecked={post?.published} />Published</label></>;
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>; }
function toLocalDateTime(value: string | null | undefined) { return value ? new Date(value).toISOString().slice(0, 16) : ""; }
