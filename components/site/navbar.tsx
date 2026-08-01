"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Menu, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/settings";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/gallery", label: "Gallery" },
  { href: "/book", label: "Book a Table" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({ settings }: { settings: SiteSettings }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Leaf className="size-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {settings.siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>
            <Button variant="outline" className="gap-2">
              <Phone className="size-4" />
              {settings.phone}
            </Button>
          </a>
          <Link href="/book">
            <Button>Reserve</Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                  pathname === link.href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t pt-3">
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>
                <Button variant="outline" className="w-full gap-2">
                  <Phone className="size-4" />
                  {settings.phone}
                </Button>
              </a>
              <Link href="/book" onClick={() => setOpen(false)}>
                <Button className="w-full">Reserve a Table</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
