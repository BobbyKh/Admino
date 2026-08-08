"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Locale {
  code: string;
  name: string;
  isDefault: boolean;
}

export function LocaleSwitcher({
  locales,
  currentLocale,
}: {
  locales: Locale[];
  currentLocale: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  useEffect(() => {
    if (pendingCode) {
      document.cookie = `admino_locale=${pendingCode};path=/;max-age=${60 * 60 * 24 * 365}`;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingCode(null);
      setPending(false);
      router.refresh();
    }
  }, [pendingCode, router]);

  if (locales.length <= 1) return null;

  const current = locales.find((l) => l.code === currentLocale) ?? locales[0];

  function switchLocale(code: string) {
    if (code === currentLocale) return;
    setPending(true);
    setPendingCode(code);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled={pending}>
          <Globe className="size-4" />
          {current.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => switchLocale(locale.code)}
            className={locale.code === currentLocale ? "font-bold" : ""}
          >
            {locale.name}
            {locale.code === currentLocale && " ✓"}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
