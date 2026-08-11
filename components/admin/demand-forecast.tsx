"use client";

import { useState, useTransition } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDemandForecast, type DemandForecast } from "@/lib/actions/ai-forecast";
import { useAdminSiteId } from "./admin-site-context";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);
}

export function DemandForecastView() {
  const siteId = useAdminSiteId();
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    setLoading(true);
    startTransition(async () => {
      const result = await getDemandForecast(siteId);
      setLoading(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setForecast(result.forecast);
    });
  }

  const maxOrders = forecast
    ? Math.max(1, ...forecast.history.map((h) => h.orders), ...forecast.forecast.map((f) => f.orders))
    : 1;

  const trendIcon =
    forecast?.trendDirection === "up" ? (
      <TrendingUp className="size-4 text-green-600" />
    ) : forecast?.trendDirection === "down" ? (
      <TrendingDown className="size-4 text-red-600" />
    ) : (
      <Minus className="size-4 text-muted-foreground" />
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Demand Forecasting</h1>
          <p className="text-sm text-muted-foreground">
            Predicts the next 30 days of orders and revenue from your last 90 days of paid orders.
          </p>
        </div>
        <Button onClick={run} disabled={loading || pending}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
          {forecast ? "Refresh forecast" : "Generate forecast"}
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Loader2 className="mb-4 size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing order history...</p>
          </CardContent>
        </Card>
      )}

      {!forecast && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="mb-4 size-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold">No forecast yet</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Generate a forecast to see projected orders and revenue, plus restock recommendations
              for products running low.
            </p>
          </CardContent>
        </Card>
      )}

      {forecast && !loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-xs text-muted-foreground">
                  Forecasted orders (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{forecast.totalForecastOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-xs text-muted-foreground">
                  Forecasted revenue (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatMoney(forecast.totalForecastRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-xs text-muted-foreground">
                  Avg daily orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{forecast.dailyAvgOrders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-xs text-muted-foreground">
                  Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold capitalize">{forecast.trendDirection}</span>
                  {trendIcon}
                </div>
              </CardContent>
            </Card>
          </div>

          {forecast.narrative && (
            <Card>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">{forecast.narrative}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-sm">
                30-day demand forecast <span className="font-normal text-muted-foreground">(daily orders)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-40 items-end gap-[3px] overflow-x-auto pb-1">
                {forecast.history.map((h, i) => (
                  <div
                    key={`h-${h.date}-${i}`}
                    className="h-full w-[6px] shrink-0 rounded-t bg-muted"
                    style={{ height: `${Math.max(2, (h.orders / maxOrders) * 100)}%` }}
                    title={`${h.date}: ${h.orders} orders`}
                  />
                ))}
                {forecast.forecast.map((f, i) => (
                  <div
                    key={`f-${f.date}-${i}`}
                    className="h-full w-[6px] shrink-0 rounded-t bg-primary/70"
                    style={{ height: `${Math.max(2, (f.orders / maxOrders) * 100)}%` }}
                    title={`${f.date}: ${f.orders} orders (forecast)`}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-sm bg-muted" /> Past (90 days)
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2.5 rounded-sm bg-primary/70" /> Forecast (30 days)
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-sm flex items-center gap-2">
                <Package className="size-4" /> Product restock forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              {forecast.productForecasts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products found.</p>
              ) : (
                <div className="space-y-3">
                  {forecast.productForecasts.map((p) => (
                    <div
                      key={p.productId}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                        p.restockAlert ? "border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          {p.title}
                          {p.restockAlert && <AlertTriangle className="size-4 text-amber-600" />}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Avg {p.avgDailyUnits} units/day · {p.forecastUnits30d} units projected in 30 days ·{" "}
                          {p.inventory} in stock
                        </p>
                        {p.restockAlert && (
                          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Restock within {p.restockAfterDays} days — suggest ordering{" "}
                            {p.suggestedRestock} units.
                          </p>
                        )}
                      </div>
                      <Badge variant={p.restockAlert ? "destructive" : "secondary"}>
                        {p.restockAlert ? "Restock soon" : "Healthy stock"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
