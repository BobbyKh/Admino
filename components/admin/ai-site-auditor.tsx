"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, Loader2, CheckCircle2, XCircle, AlertTriangle, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  runAiAudit,
  applyAuditFix,
  type AuditReport,
} from "@/lib/actions/ai-auditor";

const CATEGORY_LABELS: Record<string, string> = {
  seo: "SEO",
  content: "Content",
  commerce: "Commerce",
  a11y: "Accessibility",
  performance: "Performance",
};

const FIXABLE = /^page-meta-|^page-draft-|^product-desc-|^blog-excerpt-/;

export function AiSiteAuditor() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fixingId, setFixingId] = useState<string | null>(null);

  function runAudit() {
    setLoading(true);
    startTransition(async () => {
      const result = await runAiAudit();
      setLoading(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setReport(result.report);
    });
  }

  function fix(issueId: string) {
    setFixingId(issueId);
    startTransition(async () => {
      const result = await applyAuditFix(issueId);
      setFixingId(null);
      if (result.success) {
        toast.success("Fix applied. Re-run the audit to see the updated score.");
        setReport((prev) =>
          prev
            ? { ...prev, issues: prev.issues.filter((i) => i.id !== issueId) }
            : prev
        );
      } else {
        toast.error(result.error ?? "Couldn't apply this fix.");
      }
    });
  }

  const scoreColor = (s: number) =>
    s >= 80 ? "text-green-600" : s >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Site Auditor</h1>
          <p className="text-sm text-muted-foreground">
            Automatically scans your site for SEO, content, and commerce issues and applies fixes.
          </p>
        </div>
        <Button onClick={runAudit} disabled={loading || pending}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
          {report ? "Re-run audit" : "Run audit"}
        </Button>
      </div>

      {!report && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldCheck className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">No audit run yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Run an audit to get a health score for your site and a prioritized list of issues
              with one-click fixes.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="mb-4 size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Scanning your site...</p>
          </CardContent>
        </Card>
      )}

      {report && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex items-center gap-6 py-6">
                <div className="flex flex-col items-center">
                  <span className={cn("text-5xl font-bold", scoreColor(report.score))}>
                    {report.score}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold">Site health score</p>
                  <p className="text-sm text-muted-foreground">{report.summary}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-sm">Site stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold">{report.stats.publishedPages}/{report.stats.pages}</p>
                  <p className="text-xs text-muted-foreground">Pages published</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{report.stats.blocks}</p>
                  <p className="text-xs text-muted-foreground">Content blocks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{report.stats.products}</p>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">
              Found {report.issues.length} issue{report.issues.length === 1 ? "" : "s"}
            </h2>
            {report.issues.length === 0 && (
              <Card>
                <CardContent className="flex items-center gap-3 py-6">
                  <CheckCircle2 className="size-6 text-green-600" />
                  <p className="text-sm">Your site looks great — no issues detected.</p>
                </CardContent>
              </Card>
            )}
            {report.issues.map((issue) => (
              <Card key={issue.id}>
                <CardContent className="flex items-start gap-3 py-4">
                  {issue.severity === "high" ? (
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{issue.title}</p>
                      <Badge variant={issue.severity === "high" ? "destructive" : "secondary"}>
                        {issue.severity}
                      </Badge>
                      <Badge variant="outline">{CATEGORY_LABELS[issue.category]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{issue.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                      Location: {issue.location.label}
                    </p>
                  </div>
                  {FIXABLE.test(issue.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1"
                      disabled={pending}
                      onClick={() => fix(issue.id)}
                    >
                      {fixingId === issue.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Wrench className="size-3.5" />
                      )}
                      Auto-fix
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {report && report.issues.length > 0 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <XCircle className="size-3.5" />
          Issues marked with Auto-fix can be repaired with one click using AI. Re-run the audit
          afterward to confirm.
        </p>
      )}
    </div>
  );
}
