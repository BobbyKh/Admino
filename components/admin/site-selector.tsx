"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { selectAdminSite } from "@/lib/actions/index";

type Site = { id: number; name: string; slug: string };

export function SiteSelector({ sites, currentSiteId }: { sites: Site[]; currentSiteId: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState<string>(currentSiteId ? String(currentSiteId) : "");
  const [pending, startTransition] = useTransition();

  function handleChange(siteId: string) {
    const previous = value;
    setValue(siteId);
    startTransition(async () => {
      const result = await selectAdminSite(Number(siteId));
      if (!result.success) setValue(previous);
      router.refresh();
    });
  }

  if (sites.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Active Site
      </p>
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
        <Globe className="size-4 shrink-0 text-primary" />
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={pending}
          className="w-full bg-transparent text-sm font-medium outline-none"
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
