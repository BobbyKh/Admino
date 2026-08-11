"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, Database, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateSettings } from "@/lib/actions/settings";
import {
  reindexAiContent,
  getAiIndexStats,
} from "@/lib/actions/ai-rag";
import { useAdminSiteId } from "./admin-site-context";

export function AiRagManager({
  ragEnabled,
  indexedAt,
  hasAiKey,
}: {
  ragEnabled: boolean;
  indexedAt: string | null;
  hasAiKey: boolean;
}) {
  const siteId = useAdminSiteId();
  const [enabled, setEnabled] = useState(ragEnabled);
  const [chunks, setChunks] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  async function toggle(next: boolean) {
    setEnabled(next);
    const form = new FormData();
    form.set("aiRagEnabled", next ? "true" : "false");
    const result = await updateSettings(siteId, {}, form);
    if (result?.message && !result.success) toast.error(result.message);
    else toast.success(next ? "Knowledge base enabled." : "Knowledge base disabled.");
  }

  function runIndex() {
    startTransition(async () => {
      const result = await reindexAiContent(siteId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      const stats = await getAiIndexStats(siteId);
      if (stats.success) setChunks(stats.chunks);
    });
  }

  function loadStats() {
    startTransition(async () => {
      const stats = await getAiIndexStats(siteId);
      if (stats.success) setChunks(stats.chunks);
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Storefront Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Let visitors ask questions and get answers from your actual site content.
        </p>
      </div>

      {!hasAiKey && (
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Sparkles className="size-5 text-amber-600" />
            <p className="text-sm">
              Add an AI API key in Settings → AI to enable the storefront assistant.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-sm flex items-center gap-2">
            <Bot className="size-4" /> Enable assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            onClick={() => toggle(!enabled)}
            disabled={!hasAiKey || pending}
            className="flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors hover:border-primary/40 disabled:opacity-50"
          >
            <div>
              <p className="text-sm font-semibold">{enabled ? "Enabled" : "Disabled"}</p>
              <p className="text-xs text-muted-foreground">
                The floating chat widget appears on your storefront and answers using your site&apos;s
                content. Requires AI chat to be enabled in Settings → AI as well.
              </p>
            </div>
            <Badge variant={enabled ? "default" : "secondary"}>{enabled ? "On" : "Off"}</Badge>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-sm flex items-center gap-2">
            <Database className="size-4" /> Knowledge base
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Index your pages, blocks, products, blog posts, and services so the assistant can answer
            accurately. Re-index whenever your content changes.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={runIndex} disabled={pending || !hasAiKey}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
              {pending ? "Indexing..." : "Re-index content"}
            </Button>
            <Button variant="outline" onClick={loadStats} disabled={pending}>
              Check index
            </Button>
          </div>
          <div className="space-y-1 text-sm">
            {chunks !== null && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4 text-green-600" />
                {chunks} chunk{chunks === 1 ? "" : "s"} indexed.
              </p>
            )}
            {indexedAt && !chunks && (
              <p className="text-xs text-muted-foreground">
                Last indexed: {new Date(indexedAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
