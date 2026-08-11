"use server";

import { requireRole } from "@/lib/auth";
import { getCurrentAdminSiteId } from "@/lib/tenant-access";
import { getErrorLogs, getErrorLogById, markErrorResolved, markErrorUnresolved, deleteErrorLog, getErrorStats, type ErrorLevel } from "@/lib/error-tracking";

export async function listErrorLogs(options: {
  level?: ErrorLevel;
  resolved?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  await requireRole("admin");
  const siteId = await getCurrentAdminSiteId();
  return getErrorLogs({ ...options, siteId });
}

export async function getErrorLogDetails(id: number) {
  await requireRole("admin");
  return getErrorLogById(id, await getCurrentAdminSiteId());
}

export async function resolveError(id: number) {
  await requireRole("admin");
  await markErrorResolved(id, await getCurrentAdminSiteId());
}

export async function unresolveError(id: number) {
  await requireRole("admin");
  await markErrorUnresolved(id, await getCurrentAdminSiteId());
}

export async function removeError(id: number) {
  await requireRole("admin");
  await deleteErrorLog(id, await getCurrentAdminSiteId());
}

export async function fetchErrorStats() {
  await requireRole("admin");
  return getErrorStats(await getCurrentAdminSiteId());
}
