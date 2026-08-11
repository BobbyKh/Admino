import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { errorLogs } from "@/lib/db/schema";

export type ErrorLevel = "error" | "warning" | "info";

interface LogErrorOptions {
  siteId?: number;
  level?: ErrorLevel;
  message: string;
  stack?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ipAddress?: string;
  context?: Record<string, unknown>;
}

export async function logError(options: LogErrorOptions): Promise<void> {
  try {
    await db.insert(errorLogs).values({
      siteId: options.siteId ?? null,
      level: options.level ?? "error",
      message: options.message.slice(0, 2000),
      stack: options.stack?.slice(0, 10000) ?? null,
      url: options.url?.slice(0, 2000) ?? null,
      method: options.method ?? null,
      statusCode: options.statusCode ?? null,
      userAgent: options.userAgent?.slice(0, 500) ?? null,
      ipAddress: options.ipAddress?.slice(0, 45) ?? null,
      context: options.context ? JSON.stringify(options.context) : null,
    });
  } catch {
    // Silently fail — error logging should never break the app
  }
}

export async function getErrorLogs(options: {
  siteId?: number;
  level?: ErrorLevel;
  resolved?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  const { siteId, level, resolved, limit = 50, offset = 0 } = options;

  const conditions = [];
  if (siteId) conditions.push(eq(errorLogs.siteId, siteId));
  if (level) conditions.push(eq(errorLogs.level, level));
  if (resolved !== undefined) conditions.push(eq(errorLogs.resolved, resolved ? 1 : 0));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [errors, countResult] = await Promise.all([
    db
      .select()
      .from(errorLogs)
      .where(where)
      .orderBy(desc(errorLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(errorLogs)
      .where(where),
  ]);

  return {
    errors,
    total: countResult[0]?.count ?? 0,
  };
}

export async function getErrorLogById(id: number, siteId: number) {
  const [error] = await db.select().from(errorLogs).where(and(eq(errorLogs.id, id), eq(errorLogs.siteId, siteId)));
  return error ?? null;
}

export async function markErrorResolved(id: number, siteId: number) {
  await db.update(errorLogs).set({ resolved: 1 }).where(and(eq(errorLogs.id, id), eq(errorLogs.siteId, siteId)));
}

export async function markErrorUnresolved(id: number, siteId: number) {
  await db.update(errorLogs).set({ resolved: 0 }).where(and(eq(errorLogs.id, id), eq(errorLogs.siteId, siteId)));
}

export async function deleteErrorLog(id: number, siteId: number) {
  await db.delete(errorLogs).where(and(eq(errorLogs.id, id), eq(errorLogs.siteId, siteId)));
}

export async function getErrorStats(siteId?: number) {
  const where = siteId ? eq(errorLogs.siteId, siteId) : undefined;

  const [total, unresolved, byLevel] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(errorLogs).where(where),
    db.select({ count: sql<number>`count(*)::int` }).from(errorLogs).where(
      and(where, eq(errorLogs.resolved, 0))
    ),
    db.select({
      level: errorLogs.level,
      count: sql<number>`count(*)::int`,
    }).from(errorLogs).where(where).groupBy(errorLogs.level),
  ]);

  return {
    total: total[0]?.count ?? 0,
    unresolved: unresolved[0]?.count ?? 0,
    byLevel: Object.fromEntries(byLevel.map((r) => [r.level, r.count])),
  };
}
