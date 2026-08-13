"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Pencil, Plus, Search, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createBlogPost, deleteBlogPost, updateBlogPost } from "@/lib/actions/blog";
import { generateBlogPostWithAi } from "@/lib/actions/blog-ai";
import type { BlogPost } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/admin/media-picker";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAdminSiteId } from "./admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "./bulk-selection-scope";

export function BlogManager({ posts }: { posts: BlogPost[] }) {
  const siteId = useAdminSiteId();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState("");
  const [editingPost, setEditingPost] = React.useState<BlogPost | null | undefined>(undefined);
  const [deletingPost, setDeletingPost] = React.useState<BlogPost | null>(null);
  const visiblePosts = posts.filter((post) => `${post.title} ${post.slug} ${post.category ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  function savePost(formData: FormData) {
    startTransition(async () => {
      try {
        if (editingPost) await updateBlogPost(siteId, editingPost.id, formData);
        else await createBlogPost(siteId, formData);
        toast.success(editingPost ? "Post updated." : "Post created.");
        setEditingPost(undefined);
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to save post."); }
    });
  }

  function confirmDeletePost(post: BlogPost) {
    setDeletingPost(post);
  }

  function removePost() {
    if (!deletingPost) return;
    startTransition(async () => {
      try { await deleteBlogPost(siteId, deletingPost.id); toast.success("Post deleted."); setDeletingPost(null); router.refresh(); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete post."); setDeletingPost(null); }
    });
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-heading text-3xl font-semibold">Blog</h1><p className="mt-1 text-sm text-muted-foreground">Write and publish posts for the active site.</p></div><Button onClick={() => setEditingPost(null)}><Plus className="mr-2 size-4" />Add post</Button></div>
    <Card><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle className="font-heading">All posts</CardTitle><CardDescription>{posts.length} post{posts.length === 1 ? "" : "s"} on this site.</CardDescription></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search posts" className="pl-9" /></div></CardHeader><BulkSelectionScope siteId={siteId} entity="blog" ids={visiblePosts.map((item) => item.id)} options={[{ value: "publish", label: "Publish" }, { value: "unpublish", label: "Move to draft" }]}><CardContent className="px-0 pb-0">
      {visiblePosts.length === 0 ? <div className="flex flex-col items-center gap-3 px-6 py-12 text-center"><FileText className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{posts.length === 0 ? "No posts yet. Create your first post." : "No posts match your search."}</p>{posts.length === 0 && <Button size="sm" onClick={() => setEditingPost(null)}>Add post</Button>}</div> : <Table className="min-w-[720px] table-fixed"><TableHeader><TableRow><TableHead className="w-10"><BulkSelectAll /></TableHead><TableHead className="w-72">Post</TableHead><TableHead className="w-40">Category</TableHead><TableHead>Status</TableHead><TableHead>Published</TableHead><TableHead className="w-28 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{visiblePosts.map((post) => <TableRow key={post.id}><TableCell><BulkRowCheckbox id={post.id} label={`Select ${post.title}`} /></TableCell><TableCell><div className="flex min-w-0 items-center gap-3">{post.coverImage ? <Image src={post.coverImage} alt="" width={36} height={36} unoptimized className="size-9 rounded-md border object-cover" /> : <div className="flex size-9 items-center justify-center rounded-md bg-muted"><FileText className="size-4 text-muted-foreground" /></div>}<div className="w-52 min-w-0"><p className="truncate font-medium">{post.title}</p><p className="truncate text-xs text-muted-foreground">/blog/{post.slug}</p></div></div></TableCell><TableCell><span className="block max-w-36 truncate">{post.category ?? "Uncategorized"}</span></TableCell><TableCell><Badge variant={post.published ? "default" : "secondary"}>{post.published ? "Published" : "Draft"}</Badge></TableCell><TableCell>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : <span className="text-muted-foreground">-</span>}</TableCell><TableCell><div className="flex min-w-24 justify-end gap-1"><Button variant="ghost" size="icon-sm" onClick={() => setEditingPost(post)} aria-label={`Edit ${post.title}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={pending} onClick={() => confirmDeletePost(post)} aria-label={`Delete ${post.title}`}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>)}</TableBody></Table>}
    </CardContent></BulkSelectionScope></Card>
    <Dialog open={editingPost !== undefined} onOpenChange={(open) => !open && setEditingPost(undefined)}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <form onSubmit={(event) => { event.preventDefault(); savePost(new FormData(event.currentTarget)); }}>
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit post" : "New post"}</DialogTitle>
            <DialogDescription>Write your post content with the rich text editor below.</DialogDescription>
          </DialogHeader>
          <div className="py-5">
            <BlogPostFields key={editingPost?.id ?? "new"} siteId={siteId} post={editingPost ?? undefined} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending && <Loader2 className="mr-2 size-4 animate-spin" />}{editingPost ? "Save changes" : "Create post"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={deletingPost !== null} onOpenChange={(open) => !open && setDeletingPost(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete post?</AlertDialogTitle>
          <AlertDialogDescription>This will permanently delete &quot;{deletingPost?.title}&quot; and cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={removePost} disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{pending && <Loader2 className="mr-2 size-4 animate-spin" />}Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}

function BlogPostFields({ siteId, post }: { siteId: number; post?: BlogPost }) {
  const [coverImage, setCoverImage] = React.useState(post?.coverImage ?? "");
  const [content, setContent] = React.useState(post?.content ?? "");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiTopic, setAiTopic] = React.useState("");
  const [aiTone, setAiTone] = React.useState("informative");

  async function handleAiGenerate() {
    const topic = aiTopic.trim();
    if (!topic) { toast.error("Enter a topic for the AI to write about."); return; }
    setAiLoading(true);
    try {
      const result = await generateBlogPostWithAi(siteId, topic, aiTone);
      if ("post" in result) {
        const form = document.querySelector("form");
        const titleInput = form?.querySelector<HTMLInputElement>("[name=title]");
        const slugInput = form?.querySelector<HTMLInputElement>("[name=slug]");
        const excerptInput = form?.querySelector<HTMLTextAreaElement>("[name=excerpt]");
        if (titleInput) titleInput.value = result.post.title;
        if (slugInput) slugInput.value = result.post.slug;
        if (excerptInput) excerptInput.value = result.post.excerpt;
        setContent(result.post.content);
        toast.success("AI generated blog post content.");
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to generate blog post.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Writer */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          AI Blog Writer
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label htmlFor="ai-topic" className="text-xs">Topic</Label>
            <Input
              id="ai-topic"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g. Top 10 dishes to try this summer"
              className="mt-1"
            />
          </div>
          <div className="w-40">
            <Label htmlFor="ai-tone" className="text-xs">Tone</Label>
            <Select value={aiTone} onValueChange={setAiTone}>
              <SelectTrigger id="ai-tone" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informative">Informative</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="fun">Fun</SelectItem>
                <SelectItem value="persuasive">Persuasive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={handleAiGenerate} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {aiLoading ? "Writing..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Post fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={post?.title}
            placeholder="My blog post title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            name="slug"
            required
            defaultValue={post?.slug}
            placeholder="my-blog-post-title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={post?.category ?? ""} placeholder="e.g. News, Tips, Updates" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="publishedAt">Published at</Label>
          <Input id="publishedAt" name="publishedAt" type="datetime-local" defaultValue={toLocalDateTime(post?.publishedAt)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" name="excerpt" defaultValue={post?.excerpt ?? ""} rows={2} placeholder="Brief summary of the post..." />
      </div>

      {/* Rich text editor for content */}
      <div className="space-y-2">
        <Label>Content</Label>
        <input type="hidden" name="content" value={content} />
        <RichTextEditor value={content} onChange={setContent} placeholder="Start writing your blog post..." />
      </div>

      <div className="rounded-lg border bg-muted/20 p-4">
        <MediaPicker name="coverImage" label="Cover image" value={coverImage} onChange={setCoverImage} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="published" defaultChecked={post?.published} />
        Published
      </label>
    </div>
  );
}

function toLocalDateTime(value: string | null | undefined) { return value ? new Date(value).toISOString().slice(0, 16) : ""; }
