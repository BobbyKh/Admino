export interface PageViewEvent {
  siteId: number;
  path: string;
  referrer?: string;
  userAgent?: string;
  timestamp: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniquePaths: number;
  topPaths: Array<{ path: string; views: number }>;
}

function escapeString(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validates and sanitizes incoming analytics pageview payloads.
 */
export function sanitizePageView(raw: Partial<PageViewEvent>): PageViewEvent | null {
  if (!raw.siteId || typeof raw.siteId !== "number" || raw.siteId <= 0) {
    return null;
  }
  const path = typeof raw.path === "string" ? raw.path.trim() : "";
  if (!path || !path.startsWith("/")) {
    return null;
  }

  return {
    siteId: raw.siteId,
    path: escapeString(path.slice(0, 200)),
    referrer: raw.referrer ? escapeString(String(raw.referrer).slice(0, 300)) : undefined,
    userAgent: raw.userAgent ? escapeString(String(raw.userAgent).slice(0, 200)) : undefined,
    timestamp: raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString(),
  };
}

/**
 * Aggregates a list of raw pageview events into a tenant analytics summary.
 */
export function computeAnalyticsSummary(events: PageViewEvent[]): AnalyticsSummary {
  const counts: Record<string, number> = {};

  for (const event of events) {
    counts[event.path] = (counts[event.path] || 0) + 1;
  }

  const topPaths = Object.entries(counts)
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return {
    totalViews: events.length,
    uniquePaths: Object.keys(counts).length,
    topPaths,
  };
}
