"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Circle, Info, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { listErrorLogs, resolveError, unresolveError, removeError, fetchErrorStats } from "@/lib/actions/error-logs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";

type ErrorEntry = Awaited<ReturnType<typeof listErrorLogs>>["errors"][number];
type Stats = Awaited<ReturnType<typeof fetchErrorStats>>;

export default function ErrorLogsPage() {
  const siteId = useAdminSiteId();
  const [errors, setErrors] = React.useState<ErrorEntry[]>([]);
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);
  const [levelFilter, setLevelFilter] = React.useState<string>("all");
  const [resolvedFilter, setResolvedFilter] = React.useState<string>("unresolved");
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const limit = 20;

  const load = React.useCallback(async () => {
    try {
      const [result, statsResult] = await Promise.all([
        listErrorLogs({
          level: levelFilter === "all" ? undefined : levelFilter as "error" | "warning" | "info",
          resolved: resolvedFilter === "all" ? undefined : resolvedFilter === "resolved",
          limit,
          offset: page * limit,
        }),
        fetchErrorStats(),
      ]);
      setErrors(result.errors);
      setTotal(result.total);
      setStats(statsResult);
    } catch {
      toast.error("Failed to load error logs.");
    } finally {
      setLoading(false);
    }
  }, [levelFilter, resolvedFilter, page]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleResolve(id: number) {
    try {
      await resolveError(id);
      toast.success("Error marked as resolved.");
      void load();
    } catch {
      toast.error("Failed to update error.");
    }
  }

  async function handleUnresolve(id: number) {
    try {
      await unresolveError(id);
      toast.success("Error marked as unresolved.");
      void load();
    } catch {
      toast.error("Failed to update error.");
    }
  }

  async function handleDelete(id: number) {
    try {
      await removeError(id);
      toast.success("Error deleted.");
      void load();
    } catch {
      toast.error("Failed to delete error.");
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Error Logs</h1>
        <p className="text-sm text-muted-foreground">Monitor and manage application errors.</p>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={<XCircle className="size-5 text-red-500" />} label="Errors" value={stats.byLevel.error ?? 0} />
          <StatCard icon={<AlertTriangle className="size-5 text-yellow-500" />} label="Warnings" value={stats.byLevel.warning ?? 0} />
          <StatCard icon={<Info className="size-5 text-blue-500" />} label="Info" value={stats.byLevel.info ?? 0} />
          <StatCard icon={<Circle className="size-5 text-orange-500" />} label="Unresolved" value={stats.unresolved} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(0); }}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          <option value="all">All levels</option>
          <option value="error">Errors</option>
          <option value="warning">Warnings</option>
          <option value="info">Info</option>
        </select>
        <select
          value={resolvedFilter}
          onChange={(e) => { setResolvedFilter(e.target.value); setPage(0); }}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm"
        >
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/30" />)}
        </div>
      ) : errors.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-green-500" />
          <p className="mt-3 font-medium">No errors found</p>
          <p className="text-sm text-muted-foreground">Everything looks clean.</p>
        </div>
      ) : (
        <BulkSelectionScope siteId={siteId} entity="errors" ids={errors.map((item) => item.id)} options={[{ value: "resolve", label: "Mark resolved" }, { value: "reopen", label: "Reopen" }, { value: "delete", label: "Delete", destructive: true }]}><div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg border p-3"><BulkSelectAll /><span className="text-sm text-muted-foreground">Select all visible logs</span></div>
          {errors.map((error) => (
            <div key={error.id} className="rounded-lg border">
              <div className="px-4 pt-3"><BulkRowCheckbox id={error.id} label={`Select error ${error.id}`} /></div>
              <button
                onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30"
              >
                {expandedId === error.id ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
                <LevelIcon level={error.level} />
                <div className="flex-1 truncate">
                  <p className="font-medium">{error.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {error.url && <span>{error.method} {error.url}</span>}
                    {error.statusCode && <span> — {error.statusCode}</span>}
                    <span className="ml-2">{new Date(error.createdAt).toLocaleString()}</span>
                  </p>
                </div>
                <Badge variant={error.resolved ? "secondary" : "destructive"} className="shrink-0">
                  {error.resolved ? "Resolved" : "Open"}
                </Badge>
              </button>
              {expandedId === error.id && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  {error.stack && (
                    <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">{error.stack}</pre>
                  )}
                  {error.context && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Context</p>
                      <pre className="overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">{error.context}</pre>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {error.resolved ? (
                      <Button size="sm" variant="outline" onClick={() => void handleUnresolve(error.id)}>Mark unresolved</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => void handleResolve(error.id)}>Mark resolved</Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => void handleDelete(error.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div></BulkSelectionScope>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      {icon}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function LevelIcon({ level }: { level: string }) {
  if (level === "error") return <XCircle className="size-4 shrink-0 text-red-500" />;
  if (level === "warning") return <AlertTriangle className="size-4 shrink-0 text-yellow-500" />;
  return <Info className="size-4 shrink-0 text-blue-500" />;
}
