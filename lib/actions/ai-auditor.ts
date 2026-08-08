"use server";

import { eq, asc, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { pages, pageBlocks, products, blogPosts, navLinks } from "@/lib/db/schema";
import { getCurrentSiteRequiringFeature, requireSiteAccess } from "@/lib/tenant-access";
import { hasMinRole, type Role } from "@/lib/auth";
import { getAllServerSettings } from "@/lib/data";
import { callAiProvider } from "@/lib/ai-provider";
import { revalidatePath } from "next/cache";

export interface AuditIssue {
  id: string;
  category: "seo" | "content" | "commerce" | "a11y" | "performance";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  fix: string;
  location: { type: string; id: number; label: string };
}

export interface AuditReport {
  score: number;
  summary: string;
  issues: AuditIssue[];
  stats: {
    pages: number;
    publishedPages: number;
    blocks: number;
    products: number;
    blogPosts: number;
    navLinks: number;
  };
}

export type AiAuditResult =
  | { success: true; report: AuditReport }
  | { success: false; error: string };

function severityWeight(s: AuditIssue["severity"]): number {
  return s === "high" ? 12 : s === "medium" ? 6 : 2;
}

async function collectIssues(siteId: number): Promise<AuditIssue[]> {
  const issues: AuditIssue[] = [];
  const [pageRows, productRows, blogRows, navRows] = await Promise.all([
    db.select().from(pages).where(eq(pages.siteId, siteId)).orderBy(asc(pages.sortOrder)),
    db.select().from(products).where(eq(products.siteId, siteId)),
    db.select().from(blogPosts).where(eq(blogPosts.siteId, siteId)),
    db.select().from(navLinks).where(eq(navLinks.siteId, siteId)).orderBy(asc(navLinks.sortOrder)),
  ]);

  const pageIds = pageRows.map((p) => p.id);
  const blocks = pageIds.length
    ? await db.select().from(pageBlocks).where(and(...pageIds.map((id) => eq(pageBlocks.pageId, id))))
    : [];

  const blocksByPage = new Map<number, typeof blocks>();
  for (const b of blocks) {
    const arr = blocksByPage.get(b.pageId) ?? [];
    arr.push(b);
    blocksByPage.set(b.pageId, arr);
  }

  for (const page of pageRows) {
    const pageBlocksList = blocksByPage.get(page.id) ?? [];
    const hasContent = pageBlocksList.some((b) => b.visible && (b.config ?? "").trim().length > 0);
    const isHome = page.slug === "home";

    if (!page.metaTitle || !page.metaDescription) {
      issues.push({
        id: `page-meta-${page.id}`,
        category: "seo",
        severity: "high",
        title: `Missing SEO metadata`,
        description: `Page "${page.title}" has no meta title or meta description, which hurts search visibility.`,
        fix: "Generate an SEO title and description for this page.",
        location: { type: "page", id: page.id, label: page.title },
      });
    }

    if (!page.published && !isHome) {
      issues.push({
        id: `page-draft-${page.id}`,
        category: "content",
        severity: "low",
        title: `Page is a draft`,
        description: `Page "${page.title}" is not published yet.`,
        fix: "Publish the page when it's ready for visitors.",
        location: { type: "page", id: page.id, label: page.title },
      });
    }

    if (isHome && pageBlocksList.length === 0) {
      issues.push({
        id: `page-empty-${page.id}`,
        category: "content",
        severity: "high",
        title: `Homepage has no blocks`,
        description: "The homepage has no content blocks, so visitors will see an empty page.",
        fix: "Add hero and content blocks to the homepage.",
        location: { type: "page", id: page.id, label: page.title },
      });
    }

    if (page.published && pageBlocksList.length === 0 && !isHome) {
      issues.push({
        id: `page-empty-${page.id}`,
        category: "content",
        severity: "high",
        title: `Published page has no content`,
        description: `Page "${page.title}" is published but contains no blocks.`,
        fix: "Add content blocks before publishing, or unpublish the page.",
        location: { type: "page", id: page.id, label: page.title },
      });
    }

    if (!page.noindex && !hasContent) {
      issues.push({
        id: `page-noindex-${page.id}`,
        category: "seo",
        severity: "medium",
        title: `Empty page indexed in search`,
        description: `Page "${page.title}" is searchable but has no visible content.`,
        fix: "Either add content or set the page to noindex.",
        location: { type: "page", id: page.id, label: page.title },
      });
    }
  }

  for (const product of productRows) {
    if (!product.image) {
      issues.push({
        id: `product-image-${product.id}`,
        category: "commerce",
        severity: "medium",
        title: `Product missing image`,
        description: `Product "${product.title}" has no image.`,
        fix: "Add a product image.",
        location: { type: "product", id: product.id, label: product.title },
      });
    }
    if (!product.description) {
      issues.push({
        id: `product-desc-${product.id}`,
        category: "commerce",
        severity: "medium",
        title: `Product missing description`,
        description: `Product "${product.title}" has no description.`,
        fix: "Write a product description.",
        location: { type: "product", id: product.id, label: product.title },
      });
    }
    if (product.status === "active" && product.inventoryQuantity === 0) {
      issues.push({
        id: `product-stock-${product.id}`,
        category: "commerce",
        severity: "medium",
        title: `Active product out of stock`,
        description: `Product "${product.title}" is active but has 0 inventory.`,
        fix: "Restock the product or set it to draft.",
        location: { type: "product", id: product.id, label: product.title },
      });
    }
  }

  for (const post of blogRows) {
    if (!post.excerpt) {
      issues.push({
        id: `blog-excerpt-${post.id}`,
        category: "seo",
        severity: "low",
        title: `Blog post missing excerpt`,
        description: `Blog post "${post.title}" has no excerpt.`,
        fix: "Add a short excerpt for listing pages and SEO.",
        location: { type: "blog", id: post.id, label: post.title },
      });
    }
  }

  for (const link of navRows) {
    if (link.href && !link.href.startsWith("/") && !/^https?:\/\//i.test(link.href)) {
      issues.push({
        id: `nav-broken-${link.id}`,
        category: "a11y",
        severity: "low",
        title: `Navigation link looks invalid`,
        description: `Nav link "${link.label}" has an unusual URL: ${link.href}`,
        fix: "Use a relative path (e.g. /menu) or a full http(s) URL.",
        location: { type: "nav", id: link.id, label: link.label },
      });
    }
  }

  return issues;
}

function computeScore(issues: AuditIssue[], stats: AuditReport["stats"]): number {
  let score = 100;
  for (const issue of issues) score -= severityWeight(issue.severity);
  if (stats.publishedPages === 0) score -= 10;
  score = Math.max(0, Math.min(100, score));
  return Math.round(score);
}

export async function runAiAudit(): Promise<AiAuditResult> {
  try {
    const siteId = await getCurrentSiteRequiringFeature("ai_site_auditor");
    const user = await requireSiteAccess(siteId);
    if (!hasMinRole((user.role as Role) ?? "viewer", "editor")) {
      return { success: false, error: "You need editor permissions to run an audit." };
    }

    const [settings, pageRows, productRows, blogRows, navRows] = await Promise.all([
      getAllServerSettings(siteId),
      db.select().from(pages).where(eq(pages.siteId, siteId)),
      db.select().from(products).where(eq(products.siteId, siteId)),
      db.select().from(blogPosts).where(eq(blogPosts.siteId, siteId)),
      db.select().from(navLinks).where(eq(navLinks.siteId, siteId)),
    ]);

    const stats: AuditReport["stats"] = {
      pages: pageRows.length,
      publishedPages: pageRows.filter((p) => p.published).length,
      blocks: pageRows.length
        ? (
            await db
              .select()
              .from(pageBlocks)
              .where(and(...pageRows.map((p) => eq(pageBlocks.pageId, p.id))))
          ).length
        : 0,
      products: productRows.length,
      blogPosts: blogRows.length,
      navLinks: navRows.length,
    };

    const issues = await collectIssues(siteId);
    const score = computeScore(issues, stats);

    let summary = `Audit complete. Your site scored ${score}/100 with ${issues.length} issue${issues.length === 1 ? "" : "s"} found.`;
    if (settings.aiApiKey) {
      try {
        const summaryText = await callAiProvider({
          provider: settings.aiProvider,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
          baseUrl: settings.aiBaseUrl,
          systemPrompt:
            "You are a website QA expert. Summarize a site audit in 2-3 concise sentences: overall health, the most important issue, and the single highest-impact next action. No markdown.",
          userPrompt: `Score: ${score}/100.\nIssues:\n${issues
            .map((i) => `- [${i.severity}/${i.category}] ${i.title} on ${i.location.label}`)
            .join("\n")}`,
          maxTokens: 200,
          temperature: 0.4,
        });
        summary = summaryText.trim() || summary;
      } catch {
        /* keep fallback summary */
      }
    }

    return { success: true, report: { score, summary, issues, stats } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Audit failed.",
    };
  }
}

export async function applyAuditFix(
  issueId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const siteId = await getCurrentSiteRequiringFeature("ai_site_auditor");
    const user = await requireSiteAccess(siteId);
    if (!hasMinRole((user.role as Role) ?? "viewer", "editor")) {
      return { success: false, error: "Permission denied." };
    }
    const settings = await getAllServerSettings(siteId);

    // page-meta-<id> → generate + save SEO metadata
    const metaMatch = issueId.match(/^page-meta-(\d+)$/);
    if (metaMatch) {
      const pageId = Number(metaMatch[1]);
      const [page] = await db.select().from(pages).where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)));
      if (!page) return { success: false, error: "Page not found." };
      if (!settings.aiApiKey) return { success: false, error: "AI is not configured." };

      const blocks = await db.select().from(pageBlocks).where(eq(pageBlocks.pageId, pageId));
      const contentSnippet = blocks
        .slice(0, 4)
        .map((b) => (b.config ?? "").slice(0, 600))
        .join(" ");
      const raw = await callAiProvider({
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        baseUrl: settings.aiBaseUrl,
        systemPrompt:
          'Return ONLY a JSON object {"title":"...","description":"..."} with an SEO meta title (max 60 chars) and meta description (max 155 chars) for the page.',
        userPrompt: `Page title: ${page.title}\nPage content:\n${contentSnippet}`,
        maxTokens: 300,
        temperature: 0.5,
      });
      let meta: { title?: string; description?: string } = {};
      try {
        meta = JSON.parse(raw) as typeof meta;
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        if (m) meta = JSON.parse(m[0]) as typeof meta;
      }
      await db
        .update(pages)
        .set({
          metaTitle: meta.title?.slice(0, 60) || page.title,
          metaDescription: meta.description?.slice(0, 155) || page.description,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(pages.id, pageId));
      revalidatePath("/");
      return { success: true };
    }

    // page-draft-<id> → publish
    const draftMatch = issueId.match(/^page-draft-(\d+)$/);
    if (draftMatch) {
      const pageId = Number(draftMatch[1]);
      await db
        .update(pages)
        .set({ published: true, updatedAt: new Date().toISOString() })
        .where(and(eq(pages.id, pageId), eq(pages.siteId, siteId)));
      revalidatePath("/");
      return { success: true };
    }

    // product-desc-<id> → generate a description
    const productDescMatch = issueId.match(/^product-desc-(\d+)$/);
    if (productDescMatch) {
      const productId = Number(productDescMatch[1]);
      const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.siteId, siteId)));
      if (!product) return { success: false, error: "Product not found." };
      if (!settings.aiApiKey) return { success: false, error: "AI is not configured." };
      const desc = await callAiProvider({
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        baseUrl: settings.aiBaseUrl,
        systemPrompt:
          "Write a compelling 2-3 sentence product description. No markdown, no HTML. Only the description text.",
        userPrompt: `Product: ${product.title}${product.category ? ` (${product.category})` : ""}. Price: ${product.price / 100} ${product.currency || "usd"}.`,
        maxTokens: 250,
        temperature: 0.6,
      });
      await db
        .update(products)
        .set({ description: desc.trim().slice(0, 2000), updatedAt: new Date().toISOString() })
        .where(eq(products.id, productId));
      revalidatePath("/");
      return { success: true };
    }

    // blog-excerpt-<id> → generate excerpt
    const blogExcerptMatch = issueId.match(/^blog-excerpt-(\d+)$/);
    if (blogExcerptMatch) {
      const blogId = Number(blogExcerptMatch[1]);
      const [post] = await db.select().from(blogPosts).where(and(eq(blogPosts.id, blogId), eq(blogPosts.siteId, siteId)));
      if (!post) return { success: false, error: "Blog post not found." };
      if (!settings.aiApiKey) return { success: false, error: "AI is not configured." };
      const excerpt = await callAiProvider({
        provider: settings.aiProvider,
        apiKey: settings.aiApiKey,
        model: settings.aiModel,
        baseUrl: settings.aiBaseUrl,
        systemPrompt:
          "Write a 1-2 sentence blog excerpt summarizing the article. Plain text, no markdown.",
        userPrompt: `Title: ${post.title}\nContent:\n${(post.content ?? "").slice(0, 1500)}`,
        maxTokens: 200,
        temperature: 0.5,
      });
      await db
        .update(blogPosts)
        .set({ excerpt: excerpt.trim().slice(0, 300), updatedAt: new Date().toISOString() })
        .where(eq(blogPosts.id, blogId));
      revalidatePath("/");
      return { success: true };
    }

    return { success: false, error: "This issue can't be auto-fixed yet." };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fix failed.",
    };
  }
}
