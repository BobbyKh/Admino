import "server-only";

import { eq, desc, and, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLogs, adminUsers } from "@/lib/db/schema";
import { getSessionUser, type Role } from "@/lib/auth";

export type ActivityAction = "create" | "update" | "delete" | "status_change" | "login" | "logout";
export type ActivityEntity =
  | "settings"
  | "gallery"
  | "menu_category"
  | "menu_item"
  | "booking"
  | "message"
  | "page"
  | "page_block"
  | "site"
  | "user"
  | "media"
  | "navigation"
  | "home_section"
  | "seller_application";

export interface LogActivityOptions {
  siteId?: number | null;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId?: number | null;
  entityName?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Logs an admin activity to the activity_logs table.
 * Automatically resolves the current user from session.
 */
export async function logActivity(options: LogActivityOptions): Promise<void> {
  try {
    const user = await getSessionUser();
    if (!user) return;

    const userRole = (user.role as Role) ?? "viewer";

    await db.insert(activityLogs).values({
      siteId: options.siteId ?? null,
      userId: user.id,
      userName: user.name,
      userRole,
      action: options.action,
      entity: options.entity,
      entityId: options.entityId ?? null,
      entityName: options.entityName ?? null,
      details: options.details ? JSON.stringify(options.details) : null,
      ipAddress: options.ipAddress ?? null,
    });
  } catch (err) {
    // Activity logging should never break the main action
    console.error("Failed to log activity:", err);
  }
}

/**
 * Logs an activity without requiring a session user (for system events).
 */
export async function logSystemActivity(
  siteId: number | null,
  action: ActivityAction,
  entity: ActivityEntity,
  entityId: number | null,
  entityName: string | null,
  details: Record<string, unknown> | null
): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      siteId,
      userId: null,
      userName: "System",
      userRole: "system",
      action,
      entity,
      entityId,
      entityName,
      details: details ? JSON.stringify(details) : null,
    });
  } catch (err) {
    console.error("Failed to log system activity:", err);
  }
}

export interface GetActivityLogsOptions {
  siteId?: number | null;
  userId?: number | null;
  action?: ActivityAction;
  entity?: ActivityEntity;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get activity logs with optional filters.
 */
export async function getActivityLogs(options?: GetActivityLogsOptions) {
  const conditions = [];

  if (options?.siteId) {
    conditions.push(eq(activityLogs.siteId, options.siteId));
  }
  if (options?.userId) {
    conditions.push(eq(activityLogs.userId, options.userId));
  }
  if (options?.action) {
    conditions.push(eq(activityLogs.action, options.action));
  }
  if (options?.entity) {
    conditions.push(eq(activityLogs.entity, options.entity));
  }
  if (options?.search) {
    const q = `%${options.search}%`;
    conditions.push(ilike(activityLogs.userName, q));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const items = await db
    .select()
    .from(activityLogs)
    .where(where)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return items;
}

/**
 * Get distinct entities from activity logs for filter dropdown.
 */
export async function getActivityEntities(siteId?: number | null) {
  const conditions = siteId ? [eq(activityLogs.siteId, siteId)] : [];
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .selectDistinct({ entity: activityLogs.entity })
    .from(activityLogs)
    .where(where);

  return rows.map((r) => r.entity);
}

/**
 * Get total count of activity logs with optional filters.
 */
export async function getActivityLogsCount(options?: {
  siteId?: number | null;
  action?: ActivityAction;
  entity?: ActivityEntity;
}) {
  const conditions = [];
  if (options?.siteId) conditions.push(eq(activityLogs.siteId, options.siteId));
  if (options?.action) conditions.push(eq(activityLogs.action, options.action));
  if (options?.entity) conditions.push(eq(activityLogs.entity, options.entity));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .where(where);

  return result?.count ?? 0;
}
