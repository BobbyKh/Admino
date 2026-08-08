"use client";

import Link from "next/link";
import Image from "next/image";
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
  Download,
  Settings,
  LayoutPanelTop,
  Users,
  UtensilsCrossed,
  ShoppingBag,
  Package,
  CreditCard,
  Newspaper,
  Wrench,
  Bell,
  FlaskConical,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/lib/actions";
import { SiteSelector } from "@/components/admin/site-selector";

type Site = { id: number; name: string; slug: string };
type TenantFeature = string;

const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3,
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  feature?: TenantFeature;
  superAdminOnly?: boolean;
  minRole?: "admin";
};

type NavGroup = { label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Site Management",
    items: [
      { href: "/admin/sites", label: "Sites", icon: Globe, superAdminOnly: true },
      { href: "/admin/pages", label: "Pages", icon: FileText, feature: "pages" },
      { href: "/admin/i18n", label: "Languages", icon: Globe, feature: "pages" },
      { href: "/admin/navigation", label: "Navigation", icon: LinkIcon, feature: "navigation" },
      { href: "/admin/layout", label: "Header & Footer", icon: LayoutPanelTop, feature: "layout" },
      { href: "/admin/settings", label: "Settings", icon: Settings, feature: "settings" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays, feature: "bookings" },
      { href: "/admin/messages", label: "Messages", icon: Mail, feature: "messages" },
      { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, feature: "menu" },
      { href: "/admin/gallery", label: "Gallery", icon: Images, feature: "gallery" },
      { href: "/admin/media", label: "Media Library", icon: FolderInput, feature: "media" },
      { href: "/admin/services", label: "Services", icon: Wrench, feature: "services" },
      { href: "/admin/blog", label: "Blog", icon: Newspaper, feature: "blog" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/commerce", label: "Overview", icon: ShoppingBag, feature: "commerce" },
      { href: "/admin/commerce/products", label: "Products", icon: Package, feature: "commerce" },
      { href: "/admin/commerce/orders", label: "Orders", icon: ShoppingBag, feature: "commerce" },
      { href: "/admin/commerce/payments", label: "Payments", icon: CreditCard, feature: "commerce" },
      { href: "/admin/customers", label: "Customers", icon: Users, feature: "commerce" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, minRole: "admin" },
      { href: "/admin/billing", label: "Billing & Plans", icon: CreditCard, minRole: "admin" },
      { href: "/admin/webhooks", label: "Webhooks", icon: Bell, minRole: "admin" },
      { href: "/admin/experiments", label: "A/B Testing", icon: FlaskConical, minRole: "admin" },
      { href: "/admin/funnels", label: "Funnels", icon: BarChart3, minRole: "admin" },
      { href: "/admin/activity", label: "Activity Log", icon: ScrollText, minRole: "admin" },
      { href: "/admin/export", label: "Export", icon: Download, minRole: "admin" },
    ],
  },
];

export function AdminNav({
  adminName,
  role = "viewer",
  sites,
  currentSiteId,
  features = [],
  brandLogo = "",
  brandName = "Admino",
}: {
  adminName: string;
  role?: string;
  sites: Site[];
  currentSiteId: number;
  features?: TenantFeature[];
  brandLogo?: string;
  brandName?: string;
}) {
  const pathname = usePathname();
  const isSuperAdmin = role === "super_admin";
  const userRoleRank = ROLE_RANK[role] ?? 0;
  const currentSite = sites.find((site) => site.id === currentSiteId);
  const viewSiteHref = currentSite ? `/?site=${encodeURIComponent(currentSite.slug)}` : "/";

  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (item.minRole && userRoleRank < ROLE_RANK[item.minRole]) return false;
      if (item.feature && !features.includes(item.feature)) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="border-b px-5 py-3">
        <div className="flex items-center gap-2">
          {brandLogo ? (
            <Image
              src={brandLogo}
              alt={brandName}
              width={36}
              height={36}
              className="size-9 rounded-lg object-contain"
              unoptimized
            />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-4" />
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{brandName || "Admino"}</p>
            <p className="text-xs text-muted-foreground">Admino Web Builder</p>
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
              href={viewSiteHref}
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
