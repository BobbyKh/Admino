"use client";

import { createContext, useContext } from "react";

const AdminSiteContext = createContext<number | null>(null);

export function AdminSiteProvider({ siteId, children }: { siteId: number; children: React.ReactNode }) {
  return <AdminSiteContext.Provider value={siteId}>{children}</AdminSiteContext.Provider>;
}

export function useAdminSiteId() {
  const siteId = useContext(AdminSiteContext);
  if (!siteId) throw new Error("Active admin site is unavailable.");
  return siteId;
}
