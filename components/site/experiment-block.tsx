"use client";

import { type ReactNode } from "react";
import { useExperiment } from "./experiment-provider";

interface VariantContent {
  id: string;
  name: string;
  content: ReactNode;
}

interface ExperimentBlockProps {
  experimentSlug: string;
  variants: VariantContent[];
  fallback?: ReactNode;
}

export function ExperimentBlock({
  experimentSlug,
  variants,
  fallback = null,
}: ExperimentBlockProps) {
  const { variant, isLoaded } = useExperiment(experimentSlug);

  if (!isLoaded) return fallback;
  if (!variant) return fallback;

  const matched = variants.find((v) => v.id === variant);
  return matched?.content ?? fallback;
}
