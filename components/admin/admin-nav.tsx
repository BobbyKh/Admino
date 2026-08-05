"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  FolderInput,
  Globe,
  Images,
  LayoutDashboard,
  Link as LinkIcon,
  LogOut,
  Mail,
  FileText,
  ScrollText,
  Settings,
  LayoutPanelTop,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  CreditCard,
  Newspaper,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/lib/actions";
import { SiteSelector } from "@/components/admin/site-selector";

type Site = { id: number; name: string; slug: string };

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Site Management",
    items: [
      { href: "/admin/sites", label: "Sites", icon: Globe, superAdminOnly: true },
      { href: "/admin/pages", label: "Pages", icon: FileText },
      { href: "/admin/navigation", label: "Navigation", icon: LinkIcon },
      { href: "/admin/layout", label: "Header & Footer", icon: LayoutPanelTop },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/admin/messages", label: "Messages", icon: Mail },
      { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
      { href: "/admin/media", label: "Media Library", icon: FolderInput },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/blog", label: "Blog", icon: Newspaper },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/commerce", label: "Overview", icon: ShoppingBag },
      { href: "/admin/commerce/products", label: "Products", icon: Package },
      { href: "/admin/commerce/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/commerce/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/activity", label: "Activity Log", icon: ScrollText },
    ],
  },
];

export function AdminNav({
  adminName,
  role = "viewer",
  sites,
  currentSiteId,
}: {
  adminName: string;
  role?: string;
  sites: Site[];
  currentSiteId: number;
}) {
  const pathname = usePathname();
  const isSuperAdmin = role === "super_admin";

  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.superAdminOnly || isSuperAdmin),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="border-b px-5 py-3">
        <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <UtensilsCrossed className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Admino</p>
          <p className="text-xs text-muted-foreground">Web Builder</p>
        </div>
        </div>
        <SiteSelector sites={sites} currentSiteId={currentSiteId} />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {visibleNavGroups.map((group, gi) => (
          <div key={group.label} className={cn("mb-2", gi > 0 && "mt-3")}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((link) => {
                const active =
                  link.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 px-3 py-1.5 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{adminName}</span>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-4" />
              View site
            </Link>
          </div>
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
