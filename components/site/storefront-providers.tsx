"use client";

import { type ReactNode } from "react";
import { ExperimentProvider } from "./experiment-provider";
import { useAnalyticsTracking } from "./use-analytics-tracking";
import { CartProvider } from "./cart-provider";

export function StorefrontProviders({
  children,
  siteId,
}: {
  children: ReactNode;
  siteId: number | null;
}) {
  useAnalyticsTracking(siteId);

  return <ExperimentProvider><CartProvider>{children}</CartProvider></ExperimentProvider>;
}
