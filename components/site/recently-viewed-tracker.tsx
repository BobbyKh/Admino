"use client";

import { useEffect } from "react";
import { recordRecentlyViewedProduct } from "@/lib/actions/customers";

export function RecentlyViewedTracker({ productId }: { productId: number }) {
  useEffect(() => {
    void recordRecentlyViewedProduct(productId);
  }, [productId]);
  return null;
}
