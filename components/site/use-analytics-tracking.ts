"use client";

import { useEffect, useRef } from "react";
import { trackPageView, updatePageViewDuration } from "@/lib/actions/index";

/**
 * Hooks into page lifecycle to track page views and time-on-page.
 * Place in the storefront layout to track all page navigations.
 */
export function useAnalyticsTracking(siteId: number | null) {
  const visitorIdRef = useRef<string>("");
  const startTimeRef = useRef<number>(0);
  const currentPathRef = useRef<string>("");

  useEffect(() => {
    if (!siteId || typeof window === "undefined") return;

    startTimeRef.current = Date.now();

    // Generate or retrieve visitor ID
    const storageKey = "admino_visitor_id";
    let vid = localStorage.getItem(storageKey);
    if (!vid) {
      vid =
        crypto.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(storageKey, vid);
    }
    visitorIdRef.current = vid;

    function trackCurrentPage() {
      const path = window.location.pathname + window.location.search;
      if (path === currentPathRef.current) return;

      // Update duration for previous page
      if (currentPathRef.current && visitorIdRef.current) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        void updatePageViewDuration(visitorIdRef.current, currentPathRef.current, duration);
      }

      currentPathRef.current = path;
      startTimeRef.current = Date.now();

      void trackPageView({
        siteId,
        path,
        visitorId: vid!,
        referrer: document.referrer || undefined,
        userAgent: navigator.userAgent,
        utmSource: new URLSearchParams(window.location.search).get("utm_source") ?? undefined,
        utmMedium: new URLSearchParams(window.location.search).get("utm_medium") ?? undefined,
        utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") ?? undefined,
      });
    }

    // Track initial page view
    trackCurrentPage();

    // Track on popstate (back/forward)
    window.addEventListener("popstate", trackCurrentPage);

    // Track duration on page unload
    function handleUnload() {
      if (currentPathRef.current && visitorIdRef.current) {
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        void updatePageViewDuration(visitorIdRef.current, currentPathRef.current, duration);
      }
    }
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("popstate", trackCurrentPage);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [siteId]);
}
