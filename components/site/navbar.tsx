"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { Leaf, Menu, Phone, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import type { SiteSettings } from "@/lib/settings";
import type { NavLink } from "@/lib/db/schema";

function withPreviewSite(href: string, siteSlug: string | null) {
  if (!siteSlug || !href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "http://preview.local");
  url.searchParams.set("site", siteSlug);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function Navbar({
  settings,
  navLinks,
  showCart = false,
  showLogo = true,
  showSiteName = true,
  sticky = true,
  locales,
}: {
  settings: SiteSettings;
  navLinks: NavLink[];
  showCart?: boolean;
  showLogo?: boolean;
  showSiteName?: boolean;
  sticky?: boolean;
  locales?: Array<{ code: string; name: string; isDefault: boolean }>;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const siteSlug = searchParams.get("site");

  const visibleLinks = navLinks.filter((l) => l.visible);

  return (
    <header className={`${sticky ? "sticky top-0" : "relative"} z-40 w-full border-b bg-background/80 backdrop-blur-md`}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={withPreviewSite("/", siteSlug)} className="flex min-w-0 items-center gap-2">
          {showLogo && settings.logo ? (
            <Image
              src={settings.logo}
              alt={settings.siteName}
              width={120}
              height={40}
              className="h-10 w-auto max-w-36 rounded-md object-contain"
              unoptimized
            />
          ) : showLogo ? (
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Leaf className="size-4" />
            </span>
          ) : null}
          {showSiteName && (
            <span className="truncate text-lg font-semibold tracking-tight">
              {settings.siteName}
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => (
            <Link
              key={link.id}
              href={link.external ? link.href : withPreviewSite(link.href, siteSlug)}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
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
          {locales && locales.length > 1 && (
            <LocaleSwitcher
              locales={locales.map((l) => ({ code: l.code, name: l.name }))}
              currentLocale={locales.find((l) => l.isDefault)?.code ?? "en"}
            />
          )}
          {showCart && <Link href={withPreviewSite("/cart", siteSlug)} aria-label="View cart">
            <Button variant="ghost" size="icon"><ShoppingCart className="size-4" /></Button>
          </Link>}
          {settings.navbarShowPhone === "true" && settings.phone && (
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>
              <Button variant="outline" className="gap-2">
                <Phone className="size-4" />
                {settings.phone}
              </Button>
            </a>
          )}
          {settings.navbarCtaLabel && (
            <Link href={withPreviewSite(settings.navbarCtaLink || "/", siteSlug)}>
              <Button>{settings.navbarCtaLabel}</Button>
            </Link>
          )}
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
            {visibleLinks.map((link) => (
              <Link
                key={link.id}
                href={link.external ? link.href : withPreviewSite(link.href, siteSlug)}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
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
              {locales && locales.length > 1 && (
                <LocaleSwitcher
                  locales={locales.map((l) => ({ code: l.code, name: l.name }))}
                  currentLocale={locales.find((l) => l.isDefault)?.code ?? "en"}
                />
              )}
              {showCart && <Link href={withPreviewSite("/cart", siteSlug)} onClick={() => setOpen(false)}><Button variant="outline" className="w-full gap-2"><ShoppingCart className="size-4" />Cart</Button></Link>}
              {settings.navbarShowPhone === "true" && settings.phone && (
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Phone className="size-4" />
                    {settings.phone}
                  </Button>
                </a>
              )}
              {settings.navbarCtaLabel && (
                <Link href={withPreviewSite(settings.navbarCtaLink || "/", siteSlug)} onClick={() => setOpen(false)}>
                  <Button className="w-full">{settings.navbarCtaLabel}</Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
