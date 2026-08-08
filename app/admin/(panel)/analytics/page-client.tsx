"use client";

import { useState, useEffect } from "react";
import {
  Eye,
  Users,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  ArrowUpRight,
  Clock,
  MousePointer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSiteAnalytics, getHeatmapData } from "@/lib/actions/index";

interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; count: number }>;
  dailyViews: Array<{ date: string; views: number; visitors: number }>;
  deviceBreakdown: Array<{ device: string; count: number }>;
  countryBreakdown: Array<{ country: string; count: number }>;
  referrerBreakdown: Array<{ referrer: string; count: number }>;
  utmBreakdown: Array<{ source: string; medium: string; campaign: string; count: number }>;
  avgDuration: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  icon: typeof Eye;
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <TrendingUp className="size-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AnalyticsPageClient({ siteId }: { siteId: number }) {
  const [days, setDays] = useState("30");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [heatmapPath, setHeatmapPath] = useState("/");
  const [heatmapData, setHeatmapData] = useState<Array<{ x: number; y: number; count: number }>>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSiteAnalytics(siteId, Number(days)).then((d) => {
      setData(d as AnalyticsData);
      setLoading(false);
    });
  }, [siteId, days]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Analytics data unavailable.
      </div>
    );
  }

  const maxDailyViews = Math.max(...data.dailyViews.map((d) => d.views), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Track page views, visitors, and user behavior.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Views" value={data.totalViews.toLocaleString()} icon={Eye} />
        <StatCard label="Unique Visitors" value={data.uniqueVisitors.toLocaleString()} icon={Users} />
        <StatCard label="Avg. Duration" value={`${Math.round(data.avgDuration)}s`} icon={Clock} />
        <StatCard
          label="Pages/Visit"
          value={data.uniqueVisitors > 0 ? (data.totalViews / data.uniqueVisitors).toFixed(1) : "0"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Daily Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-1">
              {data.dailyViews.map((day) => (
                <div key={day.date} className="group relative flex-1" title={`${day.date}: ${day.views} views, ${day.visitors} visitors`}>
                  <div className="rounded-t bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${(day.views / maxDailyViews) * 100}%`, minHeight: "2px" }} />
                  <div className="mt-1 text-center text-[9px] text-muted-foreground">{new Date(day.date).getDate()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Devices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.deviceBreakdown.map((d) => {
                const total = data.deviceBreakdown.reduce((s, x) => s + x.count, 0);
                const percent = total > 0 ? (d.count / total) * 100 : 0;
                const Icon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor;
                return (
                  <div key={d.device} className="flex items-center gap-3">
                    <Icon className="size-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{d.device}</span>
                        <span className="text-muted-foreground">{percent.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {data.deviceBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Top Countries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.countryBreakdown.slice(0, 5).map((c) => (
                <div key={c.country ?? "unknown"} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Globe className="size-3 text-muted-foreground" />
                    {c.country ?? "Unknown"}
                  </span>
                  <Badge variant="secondary" className="text-xs">{c.count.toLocaleString()}</Badge>
                </div>
              ))}
              {data.countryBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.topPages.map((p) => (
              <div key={p.path} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 truncate">
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{p.path}</span>
                </span>
                <Badge variant="secondary" className="text-xs">{p.count.toLocaleString()}</Badge>
              </div>
            ))}
            {data.topPages.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Referrers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.referrerBreakdown.slice(0, 5).map((r) => {
              let hostname = r.referrer ?? "Direct";
              try { if (r.referrer) hostname = new URL(r.referrer).hostname; } catch { /* keep as-is */ }
              return (
                <div key={r.referrer} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 truncate">
                    <Globe className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{hostname}</span>
                  </span>
                  <Badge variant="secondary" className="text-xs">{r.count.toLocaleString()}</Badge>
                </div>
              );
            })}
            {data.referrerBreakdown.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">UTM Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {data.utmBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No UTM data yet.</p>
            ) : (
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">Source</th>
                      <th className="px-3 py-2 text-left font-medium">Medium</th>
                      <th className="px-3 py-2 text-left font-medium">Campaign</th>
                      <th className="px-3 py-2 text-right font-medium">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.utmBreakdown.map((u, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">{u.source}</td>
                        <td className="px-3 py-2">{u.medium}</td>
                        <td className="px-3 py-2">{u.campaign}</td>
                        <td className="px-3 py-2 text-right">{u.count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointer className="size-4" />
              Click Heatmap
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input value={heatmapPath} onChange={(e) => setHeatmapPath(e.target.value)} placeholder="Page path (e.g. /)" className="w-48 h-8 text-xs" />
              <Button variant="outline" size="sm" disabled={heatmapLoading} onClick={async () => {
                setHeatmapLoading(true);
                try {
                  const clicks = await getHeatmapData(siteId, heatmapPath);
                  setHeatmapData(clicks as Array<{ x: number; y: number; count: number }>);
                } catch { setHeatmapData([]); } finally { setHeatmapLoading(false); }
              }}>
                {heatmapLoading ? "Loading..." : "Load"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {heatmapData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No click data yet. Enter a page path and click Load to view the heatmap.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="relative mx-auto aspect-[16/9] max-w-2xl overflow-hidden rounded-lg border bg-muted/30">
                {heatmapData.map((point, i) => {
                  const maxCount = Math.max(...heatmapData.map((d) => d.count));
                  const intensity = maxCount > 0 ? point.count / maxCount : 0;
                  return (
                    <div key={i} className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{
                      left: `${(point.x / 1000) * 100}%`, top: `${(point.y / 1000) * 100}%`,
                      background: `radial-gradient(circle, rgba(239,68,68,${0.3 + intensity * 0.7}) 0%, rgba(239,68,68,0) 70%)`,
                      width: `${16 + intensity * 24}px`, height: `${16 + intensity * 24}px`,
                    }} title={`${point.count} clicks at (${point.x}, ${point.y})`} />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {heatmapData.length} click points recorded. Larger red dots indicate more clicks.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
