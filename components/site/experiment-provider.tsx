"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { getVisitorVariant, trackConversion } from "@/lib/actions/experiments";

interface ExperimentContextValue {
  getVariant: (experimentSlug: string) => string | null;
  trackExperimentConversion: (
    experimentSlug: string,
    value?: number
  ) => Promise<void>;
  isLoaded: boolean;
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  const storageKey = "admino_visitor_id";
  let id = localStorage.getItem(storageKey);
  if (!id) {
    id =
      crypto.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(storageKey, id);
  }
  return id;
}

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const loadedRef = useRef(false);

  const getVariant = useCallback(
    (experimentSlug: string) => variants[experimentSlug] ?? null,
    [variants]
  );

  const trackExperimentConversion = useCallback(
    async (experimentSlug: string, value?: number) => {
      const visitorId = getVisitorId();
      if (!visitorId) return;
      await trackConversion(experimentSlug, visitorId, value);
    },
    []
  );

  useEffect(() => {
    if (loadedRef.current) return;
    const pending = document.querySelectorAll<HTMLElement>(
      "[data-experiment]"
    );
    if (pending.length === 0) {
      loadedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoaded(true);
      return;
    }

    const visitorId = getVisitorId();
    const slugs = Array.from(pending).map(
      (el) => el.dataset.experiment!
    );
    const uniqueSlugs = [...new Set(slugs)];

    Promise.all(
      uniqueSlugs.map(async (slug) => {
        try {
          const variant = await getVisitorVariant(slug, visitorId);
          return [slug, variant] as const;
        } catch {
          return [slug, null] as const;
        }
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      for (const [slug, variant] of results) {
        if (variant) map[slug] = variant;
      }
      loadedRef.current = true;
      setVariants(map);
      setIsLoaded(true);
    });
  }, []);

  return (
    <ExperimentContext.Provider
      value={{ getVariant, trackExperimentConversion, isLoaded }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment(experimentSlug: string) {
  const ctx = useContext(ExperimentContext);
  if (!ctx) {
    return {
      variant: null,
      trackConversion: async () => {},
      isLoaded: false,
    };
  }
  return {
    variant: ctx.getVariant(experimentSlug),
    trackConversion: (value?: number) =>
      ctx.trackExperimentConversion(experimentSlug, value),
    isLoaded: ctx.isLoaded,
  };
}
