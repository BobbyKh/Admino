"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Square,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getExperiments,
  createExperiment,
  updateExperimentStatus,
  deleteExperiment,
  getExperimentResults,
} from "@/lib/actions/index";
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";

interface Experiment {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  trafficPercent: number;
  variants: string;
  createdAt: string;
}

interface VariantResult {
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  totalValue: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  running: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

export default function ExperimentsPage() {
  const siteId = useAdminSiteId();
  const [experimentsList, setExperimentsList] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<number | null>(null);
  const [results, setResults] = useState<VariantResult[] | null>(null);

  useEffect(() => {
    getExperiments().then((e) => {
      setExperimentsList(e as Experiment[]);
      setLoading(false);
    });
  }, []);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Build variants from form
    const variantNames = formData.getAll("variantName") as string[];
    const variantWeights = formData.getAll("variantWeight") as string[];
    const variants = variantNames
      .filter((n) => n.trim())
      .map((name, i) => ({
        id: `v${i + 1}`,
        name: name.trim(),
        weight: Number(variantWeights[i]) || 50,
      }));

    if (variants.length < 2) {
      toast.error("At least 2 variants are required.");
      return;
    }

    formData.set("variants", JSON.stringify(variants));

    startTransition(async () => {
      const result = await createExperiment({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowAdd(false);
        const updated = await getExperiments();
        setExperimentsList(updated as Experiment[]);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleStatusChange(id: number, status: "running" | "paused" | "completed") {
    startTransition(async () => {
      const result = await updateExperimentStatus(id, status);
      if (result?.success) {
        setExperimentsList((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status } : e))
        );
        toast.success(result.message);
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteExperiment(id);
      if (result?.success) {
        toast.success(result.message);
        setExperimentsList((prev) => prev.filter((e) => e.id !== id));
      }
    });
  }

  function loadResults(id: number) {
    setSelectedExperiment(id);
    getExperimentResults(id).then((r) => {
      if (r?.results) setResults(r.results as VariantResult[]);
    });
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A/B Testing</h1>
          <p className="text-sm text-muted-foreground">
            Create experiments to test different variants and measure conversions.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Create Experiment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Experiment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input name="name" required placeholder="Homepage CTA Test" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug *</Label>
                  <Input name="slug" required placeholder="homepage-cta" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea name="description" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label>Traffic % (0-100)</Label>
                <Input
                  name="trafficPercent"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="50"
                />
              </div>
              <div className="space-y-2">
                <Label>Variants (min 2)</Label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        name="variantName"
                        placeholder={`Variant ${i < 2 ? String.fromCharCode(65 + i) : `${i + 1}`}`}
                        className="flex-1"
                      />
                      <Input
                        name="variantWeight"
                        type="number"
                        min="1"
                        defaultValue="50"
                        className="w-20"
                        placeholder="Weight"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_350px]">
        <BulkSelectionScope siteId={siteId} entity="experiments" ids={experimentsList.map((item) => item.id)} options={[{ value: "pause", label: "Pause running" }, { value: "resume", label: "Resume paused" }, { value: "complete", label: "Complete" }, { value: "delete_drafts", label: "Delete drafts", destructive: true }]}><div className="space-y-3">
          {experimentsList.length > 0 && <div className="flex items-center gap-2 rounded-lg border p-3"><BulkSelectAll /><span className="text-sm text-muted-foreground">Select all experiments</span></div>}
          {experimentsList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <FlaskConical className="mb-4 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No experiments yet. Create your first A/B test.
                </p>
              </CardContent>
            </Card>
          ) : (
            experimentsList.map((exp) => (
              <Card key={exp.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <BulkRowCheckbox id={exp.id} label={`Select ${exp.name}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{exp.name}</p>
                      <Badge className={STATUS_STYLES[exp.status] ?? ""}>
                        {exp.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {exp.slug} · {exp.trafficPercent}% traffic
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(() => {
                        try {
                          return (JSON.parse(exp.variants) as Array<{ name: string }>).map(
                            (v, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {v.name}
                              </Badge>
                            )
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {exp.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(exp.id, "running")}
                      >
                        <Play className="size-4 text-green-500" />
                      </Button>
                    )}
                    {exp.status === "running" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(exp.id, "paused")}
                      >
                        <Pause className="size-4 text-yellow-500" />
                      </Button>
                    )}
                    {exp.status === "paused" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(exp.id, "running")}
                      >
                        <Play className="size-4 text-green-500" />
                      </Button>
                    )}
                    {(exp.status === "running" || exp.status === "paused") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(exp.id, "completed")}
                      >
                        <Square className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadResults(exp.id)}
                    >
                      <BarChart3 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => handleDelete(exp.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div></BulkSelectionScope>

        <div>
          {selectedExperiment && results ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.map((r) => (
                  <div key={r.variantId} className="rounded-lg border p-3">
                    <p className="font-medium">{r.variantName}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Impressions</p>
                        <p className="font-bold">{r.impressions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="font-bold">{r.conversions.toLocaleString()}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Conversion Rate</p>
                        <p className="text-lg font-bold">
                          {r.conversionRate.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <p className="text-sm text-muted-foreground">
                  Select an experiment to view results.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
