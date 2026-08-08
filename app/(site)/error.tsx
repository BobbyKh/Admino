"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <AlertTriangle className="mb-4 size-12 text-destructive" />
      <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
      <p className="mb-2 text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      {error.digest && (
        <p className="mb-4 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">
          Error: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Back to Home</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
