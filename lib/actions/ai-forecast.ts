"use server";

import { eq, and, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { requireSiteFeatureForRole } from "@/lib/tenant-access";
import { getAllServerSettings } from "@/lib/data";
import { callAiProvider } from "@/lib/ai-provider";

export interface ForecastPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface ProductForecast {
  productId: number;
  title: string;
  avgDailyUnits: number;
  forecastUnits30d: number;
  inventory: number;
  restockAfterDays: number;
  restockAlert: boolean;
  suggestedRestock: number;
}

export interface DemandForecast {
  history: ForecastPoint[];
  forecast: ForecastPoint[];
  totalForecastRevenue: number;
  totalForecastOrders: number;
  dailyAvgOrders: number;
  trendDirection: "up" | "down" | "flat";
  narrative: string;
  productForecasts: ProductForecast[];
}

export type ForecastResult =
  | { success: true; forecast: DemandForecast }
  | { success: false; error: string };

const DAY_MS = 86_400_000;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

export async function getDemandForecast(siteId: number): Promise<ForecastResult> {
  try {
    await requireSiteFeatureForRole(siteId, "ai_forecasting", "editor");

    const startIso = daysAgoIso(90);
    const paidOrders = await db
      .select({ id: orders.id, total: orders.total, createdAt: orders.createdAt })
      .from(orders)
      .where(and(eq(orders.siteId, siteId), eq(orders.status, "paid"), gte(orders.createdAt, startIso)));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Daily histogram (last 90 days).
    const history: ForecastPoint[] = [];
    const ordersByDay = new Map<string, { count: number; revenue: number }>();
    for (const o of paidOrders) {
      const d = new Date(o.createdAt);
      const key = d.toISOString().slice(0, 10);
      const cur = ordersByDay.get(key) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.total;
      ordersByDay.set(key, cur);
    }
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      const key = d.toISOString().slice(0, 10);
      const v = ordersByDay.get(key) ?? { count: 0, revenue: 0 };
      history.push({ date: key, orders: v.count, revenue: v.revenue });
    }

    // Simple trend: compare last 30 days to prior 30 days.
    const last30 = history.slice(-30);
    const prior30 = history.slice(-60, -30);
    const last30Sum = last30.reduce((s, d) => s + d.orders, 0);
    const prior30Sum = prior30.reduce((s, d) => s + d.orders, 0);
    const trend = last30Sum > prior30Sum * 1.1 ? "up" : last30Sum < prior30Sum * 0.9 ? "down" : "flat";

    // 30-day forecast: exponential moving average + day-of-week factor + trend.
    const ema = movingAverage(last30.map((d) => d.orders));
    const dowFactor = dayOfWeekFactors(history.slice(-84));
    const dailyAvgOrders = last30Sum / Math.max(1, last30.length);

    const forecast: ForecastPoint[] = [];
    let cumulativeOrders = 0;
    let cumulativeRevenue = 0;
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today.getTime() + i * DAY_MS);
      const dow = date.getDay();
      const base = ema * (dowFactor.get(dow) ?? 1);
      const trendBoost = trend === "up" ? 1 + i * 0.003 : trend === "down" ? 1 - i * 0.003 : 1;
      const ordersCount = Math.max(0, Math.round(base * trendBoost * 0.95));
      const avgOrder = last30.reduce((s, d) => s + d.revenue, 0) / Math.max(1, last30.reduce((s, d) => s + d.orders, 0));
      const revenue = Math.round(ordersCount * (avgOrder || 1));
      cumulativeOrders += ordersCount;
      cumulativeRevenue += revenue;
      forecast.push({
        date: date.toISOString().slice(0, 10),
        orders: ordersCount,
        revenue,
      });
    }

    // Per-product forecasts + restock alerts.
    const productRows = await db
      .select({ id: products.id, title: products.title, inventoryQuantity: products.inventoryQuantity })
      .from(products)
      .where(eq(products.siteId, siteId));
    const productForecasts: ProductForecast[] = [];
    if (productRows.length > 0) {
      const itemRows = await db
        .select({
          productId: orderItems.productId,
          quantity: orderItems.quantity,
          createdAt: orders.createdAt,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(eq(orders.siteId, siteId), eq(orders.status, "paid"), gte(orders.createdAt, startIso)));

      for (const product of productRows) {
        const items = itemRows.filter((r) => r.productId === product.id);
        const totalUnits = items.reduce((s, r) => s + r.quantity, 0);
        const avgDaily = totalUnits / 90;
        const forecastUnits30d = Math.round(avgDaily * 30);
        const restockAfterDays = avgDaily > 0 ? Math.floor(product.inventoryQuantity / avgDaily) : 0;
        const restockAlert = product.inventoryQuantity <= forecastUnits30d;
        productForecasts.push({
          productId: product.id,
          title: product.title,
          avgDailyUnits: Number(avgDaily.toFixed(2)),
          forecastUnits30d,
          inventory: product.inventoryQuantity,
          restockAfterDays,
          restockAlert,
          suggestedRestock: Math.max(0, forecastUnits30d * 2 - product.inventoryQuantity),
        });
      }
      productForecasts.sort((a, b) => Number(b.restockAlert) - Number(a.restockAlert) || a.forecastUnits30d - b.forecastUnits30d);
    }

    // AI narrative when a key is configured.
    let narrative = "";
    const settings = await getAllServerSettings(siteId);
    if (settings.aiApiKey) {
      try {
        narrative = await callAiProvider({
          provider: settings.aiProvider,
          apiKey: settings.aiApiKey,
          model: settings.aiModel,
          baseUrl: settings.aiBaseUrl,
          systemPrompt:
            "You are a retail demand forecaster. In 2-3 concise sentences, summarize the forecast: trend direction, expected 30-day orders and revenue, notable weekly patterns, and any restock risks. Plain text, no markdown.",
          userPrompt: `Last 30 days orders: ${last30Sum}, prior 30 days: ${prior30Sum} (trend: ${trend}).\n30-day forecast: ${cumulativeOrders} orders, ${cumulativeRevenue} revenue.\nTop restock alerts:\n${productForecasts
            .filter((p) => p.restockAlert)
            .slice(0, 5)
            .map((p) => `- ${p.title}: inventory ${p.inventory}, projected ${p.forecastUnits30d}`)
            .join("\n")}`,
          maxTokens: 250,
          temperature: 0.4,
        });
      } catch {
        narrative = "";
      }
    }

    return {
      success: true,
      forecast: {
        history,
        forecast,
        totalForecastRevenue: cumulativeRevenue,
        totalForecastOrders: cumulativeOrders,
        dailyAvgOrders: Number(dailyAvgOrders.toFixed(2)),
        trendDirection: trend as "up" | "down" | "flat",
        narrative: narrative.trim(),
        productForecasts,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Forecasting failed.",
    };
  }
}

function movingAverage(values: number[], window = 7): number {
  if (values.length === 0) return 0;
  const recent = values.slice(-window);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

function dayOfWeekFactors(history: ForecastPoint[]): Map<number, number> {
  const sums = new Map<number, number>();
  const counts = new Map<number, number>();
  for (const d of history) {
    const dow = new Date(`${d.date}T00:00:00`).getDay();
    sums.set(dow, (sums.get(dow) ?? 0) + d.orders);
    counts.set(dow, (counts.get(dow) ?? 0) + 1);
  }
  let total = 0;
  for (const [, sum] of sums) total += sum;
  const avg = total / Math.max(1, history.length);
  const factors = new Map<number, number>();
  for (let dow = 0; dow < 7; dow++) {
    const dayAvg = (sums.get(dow) ?? 0) / Math.max(1, counts.get(dow) ?? 0);
    factors.set(dow, avg > 0 ? dayAvg / avg : 1);
  }
  return factors;
}
