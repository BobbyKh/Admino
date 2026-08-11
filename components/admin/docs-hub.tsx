"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  BookOpen,
  ExternalLink,
  Rocket,
  FileText,
  ShoppingBag,
  Sparkles,
  Settings,
  Shield,
  Code2,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOC_CATEGORIES, searchDocs, type DocArticle, type DocBlock } from "@/lib/docs-content";

const ICONS: Record<string, typeof Rocket> = {
  Rocket,
  FileText,
  ShoppingBag,
  Sparkles,
  Settings,
  Shield,
  Code2,
};

function RenderBlock({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mt-8 mb-3 text-lg font-semibold">{block.text}</h2>;
    case "p":
      return <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{block.text}</p>;
    case "ul":
      return (
        <ul className="mb-3 space-y-1.5 text-sm text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mb-3 space-y-1.5 text-sm text-muted-foreground">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {i + 1}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ol>
      );
    case "steps":
      return (
        <div className="mb-4 rounded-lg border bg-muted/30 p-4">
          {block.title && <p className="mb-2 text-sm font-semibold">{block.title}</p>}
          <ol className="space-y-2 text-sm text-muted-foreground">
            {block.items.map((item, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "tip":
      return (
        <div className="mb-4 flex gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="leading-relaxed text-foreground">{block.text}</p>
        </div>
      );
    case "code":
      return (
        <pre className="mb-4 overflow-x-auto rounded-lg bg-muted px-4 py-3 text-xs leading-relaxed text-foreground">
          <code>{block.code}</code>
        </pre>
      );
    case "table":
      return (
        <div className="mb-4 overflow-x-auto rounded-lg border">
          <table className="min-w-[36rem] w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {block.headers.map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-muted-foreground">
                      <code className={ci === 0 ? "text-foreground" : undefined}>{cell}</code>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null;
  }
}

export function DocsHub() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [localActive, setLocalActive] = useState<{ categoryId: string; articleId: string } | null>(null);

  // Support /admin/docs?cat=getting-started&article=create-site deep links.
  // The URL wins when present; local selection is used otherwise.
  const cat = searchParams.get("cat");
  const articleId = searchParams.get("article");
  const urlActive = useMemo(() => {
    if (!cat) return null;
    const category = DOC_CATEGORIES.find((c) => c.id === cat);
    if (!category) return null;
    const article = articleId
      ? category.articles.find((a) => a.id === articleId)
      : category.articles[0];
    return article ? { categoryId: category.id, articleId: article.id } : null;
  }, [cat, articleId]);

  const active = urlActive ?? localActive;

  const results = useMemo(() => searchDocs(query), [query]);

  const activeArticle = active
    ? DOC_CATEGORIES.find((c) => c.id === active.categoryId)?.articles.find((a) => a.id === active.articleId)
    : undefined;

  const totalArticles = DOC_CATEGORIES.reduce((n, c) => n + c.articles.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
        <p className="text-sm text-muted-foreground">
          Guides for every part of the Admino platform — {totalArticles} articles across {DOC_CATEGORIES.length} areas.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLocalActive(null);
          }}
          placeholder="Search documentation (e.g. webhook, product, RAG, publish)..."
          className="pl-9"
        />
      </div>

      {query ? (
        <div className="space-y-2">
          {results.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;.
            </p>
          )}
          {results.map(({ category, article }) => {
            const Icon = ICONS[category.icon] ?? BookOpen;
            return (
              <button
                key={article.id}
                onClick={() => {
                  setLocalActive({ categoryId: category.id, articleId: article.id });
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 rounded-lg border bg-background px-4 py-3 text-left transition-colors hover:border-primary/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{article.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{article.summary}</span>
                </span>
                <Badge variant="outline">{category.label}</Badge>
              </button>
            );
          })}
        </div>
      ) : activeArticle ? (
        <ArticleView article={activeArticle} onBack={() => setLocalActive(null)} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {DOC_CATEGORIES.map((category) => {
            const Icon = ICONS[category.icon] ?? BookOpen;
            return (
              <Card key={category.id}>
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="font-semibold">{category.label}</p>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {category.articles.map((article) => (
                      <li key={article.id}>
                        <button
                          onClick={() => setLocalActive({ categoryId: category.id, articleId: article.id })}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {article.title}
                          <ArrowRight className="size-3.5 opacity-40" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArticleView({ article, onBack }: { article: DocArticle; onBack: () => void }) {
  return (
    <div className="max-w-3xl">
      <button onClick={onBack} className="mb-4 text-sm text-muted-foreground hover:text-foreground">
        ← Back to docs
      </button>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold tracking-tight">{article.title}</h1>
        {article.href && (
          <Link
            href={article.href}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            Open page <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
      <p className="mb-6 text-sm text-muted-foreground">{article.summary}</p>
      {article.blocks.map((block, i) => (
        <RenderBlock key={i} block={block} />
      ))}
    </div>
  );
}
