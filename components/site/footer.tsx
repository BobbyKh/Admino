import Link from "next/link";
import Image from "next/image";
import { Clock, Leaf, Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/settings";
import type { NavLink } from "@/lib/db/schema";

export function Footer({
  settings,
  navLinks,
}: {
  settings: SiteSettings;
  navLinks: NavLink[];
}) {
  const visibleLinks = navLinks.filter((l) => l.visible);

  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2">
            {settings.logo ? (
              <Image
                src={settings.logo}
                alt={settings.siteName}
                width={36}
                height={36}
                className="size-9 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Leaf className="size-4" />
              </span>
            )}
            <span className="text-lg font-semibold">{settings.siteName}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {settings.tagline}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            {visibleLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Visit Us</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>{settings.address}</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0" />
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-foreground">
                {settings.phone}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0" />
              <a href={`mailto:${settings.email}`} className="hover:text-foreground">
                {settings.email}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Hours</h3>
          <p className="mt-4 flex items-center gap-2.5 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" />
            {settings.hours}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {settings.priceRange} ·{" "}
            <span className="text-amber-600">★ {settings.rating}</span>
          </p>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {settings.siteName}. All rights reserved.</p>
          <p>{settings.footerNote}</p>
        </div>
      </div>
    </footer>
  );
}
