"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Funnel,
  Plus,
  Trash2,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getFunnels,
  createFunnel,
  deleteFunnel,
  getFunnelResults,
} from "@/lib/actions/funnels";
import { toast } from "sonner";

interface FunnelData {
  id: number;
  name: string;
  steps: string;
  createdAt: string;
}

interface FunnelResult {
  funnel: FunnelData;
  steps: Array<{
    step: number;
    pattern: string;
    visitors: number;
    conversionRate: number;
    dropoffRate: number;
  }>;
  totalVisitors: number;
}

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [results, setResults] = useState<FunnelResult | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [stepInputs, setStepInputs] = useState<string[]>(["", ""]);

  async function loadData() {
    setLoading(true);
    const data = await getFunnels();
    setFunnels(data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const [, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      formData.set("steps", JSON.stringify(stepInputs.filter(Boolean)));
      const result = await createFunnel(null, formData);
      if (result.success) {
        toast.success(result.message);
        setCreateOpen(false);
        setStepInputs(["", ""]);
        loadData();
      } else {
        toast.error(result.message);
      }
      return result;
    },
    null
  );

  async function handleViewResults(funnelId: number) {
    setResultsLoading(true);
    const data = await getFunnelResults(funnelId);
    setResults(data);
    setResultsLoading(false);
  }

  async function handleDelete(funnelId: number) {
    const result = await deleteFunnel(funnelId);
    if (result.success) {
      toast.success(result.message);
      setFunnels((prev) => prev.filter((f) => f.id !== funnelId));
      if (results?.funnel.id === funnelId) setResults(null);
    } else {
      toast.error(result.message);
    }
  }

  function addStep() {
    setStepInputs((prev) => [...prev, ""]);
  }

  function removeStep(index: number) {
    if (stepInputs.length <= 2) return;
    setStepInputs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, value: string) {
    setStepInputs((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Conversion Funnels
          </h1>
          <p className="text-muted-foreground">
            Track visitor progression through multi-step conversion paths.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Funnel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Funnel</DialogTitle>
              <DialogDescription>
                Define a conversion funnel with ordered URL path patterns.
              </DialogDescription>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Funnel Name</label>
                <Input name="name" placeholder="e.g. Checkout Flow" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Steps (URL path patterns)
                </label>
                <p className="text-xs text-muted-foreground">
                  Each step is a URL path fragment. Visitors matching these
                  patterns in order are counted as progressing through the
                  funnel.
                </p>
                {stepInputs.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {i + 1}
                    </Badge>
                    <Input
                      placeholder={`e.g. ${i === 0 ? "/products" : i === 1 ? "/cart" : "/checkout"}`}
                      value={step}
                      onChange={(e) => updateStep(i, e.target.value)}
                    />
                    {stepInputs.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStep(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Funnel"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-semibold">Funnels</h2>
          {loading ? (
            <Card>
              <CardContent className="p-4 text-center text-muted-foreground">
                Loading...
              </CardContent>
            </Card>
          ) : funnels.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Funnel className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No funnels yet.</p>
                <p className="text-sm mt-1">
                  Create one to start tracking conversions.
                </p>
              </CardContent>
            </Card>
          ) : (
            funnels.map((funnel) => {
              const steps = JSON.parse(funnel.steps) as string[];
              return (
                <Card
                  key={funnel.id}
                  className={
                    results?.funnel.id === funnel.id ? "ring-2 ring-primary" : ""
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{funnel.name}</h3>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewResults(funnel.id)}
                        >
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(funnel.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {steps.map((step, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ArrowRight className="h-3 w-3" />}
                          <Badge variant="secondary" className="text-xs">
                            {step}
                          </Badge>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="lg:col-span-2">
          {resultsLoading ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Loading results...
              </CardContent>
            </Card>
          ) : results ? (
            <Card>
              <CardHeader>
                <CardTitle>{results.funnel.name} — Results</CardTitle>
                <CardDescription>
                  {results.totalVisitors} unique visitors entered this funnel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.steps.map((step, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Step {step.step}</Badge>
                          <span className="font-mono text-sm">
                            {step.pattern}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>
                            <strong>{step.visitors}</strong> visitors
                          </span>
                          <span className="text-muted-foreground">
                            {step.conversionRate}% conversion
                          </span>
                          {i > 0 && (
                            <span className="text-destructive">
                              {step.dropoffRate}% drop-off
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                          style={{ width: `${step.conversionRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Select a funnel to view its conversion results.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
