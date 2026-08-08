"use server";

import { requireRole } from "@/lib/auth";
import { getErrorLogs, getErrorLogById, markErrorResolved, markErrorUnresolved, deleteErrorLog, getErrorStats, type ErrorLevel } from "@/lib/error-tracking";

export async function listErrorLogs(options: {
  level?: ErrorLevel;
  resolved?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  await requireRole("admin");
  return getErrorLogs(options);
}

export async function getErrorLogDetails(id: number) {
  await requireRole("admin");
  return getErrorLogById(id);
}

export async function resolveError(id: number) {
  await requireRole("admin");
  await markErrorResolved(id);
}

export async function unresolveError(id: number) {
  await requireRole("admin");
  await markErrorUnresolved(id);
}

export async function removeError(id: number) {
  await requireRole("admin");
  await deleteErrorLog(id);
}

export async function fetchErrorStats() {
  await requireRole("admin");
  return getErrorStats();
}
