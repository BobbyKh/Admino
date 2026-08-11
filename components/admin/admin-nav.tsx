"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  Menu,
  ChevronDown,
  Bot,
  ShieldAlert,
  LineChart,
  MessagesSquare,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/lib/actions";
import { SiteSelector } from "@/components/admin/site-selector";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

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
    label: "AI Tools",
    items: [
      { href: "/admin/ai-builder", label: "AI Site Builder", icon: Bot, feature: "ai_site_builder" },
      { href: "/admin/ai-auditor", label: "AI Site Auditor", icon: ShieldAlert, feature: "ai_site_auditor" },
      { href: "/admin/ai-chatbot", label: "AI Storefront Assistant", icon: MessagesSquare, feature: "ai_chatbot_rag" },
      { href: "/admin/ai-forecast", label: "AI Demand Forecast", icon: LineChart, feature: "ai_forecasting" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/docs", label: "Documentation", icon: BookOpen },
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

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  // Exact match for parent routes, prefix match for leaf routes
  const segments = href.split("/").filter(Boolean);
  if (segments.length <= 2) {
    // Parent route like /admin/commerce — exact match
    return pathname === href;
  }
  // Leaf route like /admin/commerce/products — prefix match
  return pathname.startsWith(href);
}

function NavContent({
  visibleNavGroups,
  pathname,
  adminName,
  viewSiteHref,
  onLinkClick,
}: {
  visibleNavGroups: ReturnType<typeof filterNavGroups>;
  pathname: string;
  adminName: string;
  viewSiteHref: string;
  onLinkClick?: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Auto-expand groups containing the active link
    const updates: Record<string, boolean> = {};
    for (const group of visibleNavGroups) {
      const hasActive = group.items.some((item) => isActive(pathname, item.href));
      if (hasActive) updates[group.label] = true;
    }
    if (Object.keys(updates).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedGroups((prev) => ({ ...prev, ...updates }));
    }
  }, [pathname, visibleNavGroups]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  return (
    <>
      <div className="border-b px-5 py-3">
        <div className="flex items-center gap-2">
          {viewSiteHref && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="size-4" />
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">Admin Panel</p>
            <p className="text-xs text-muted-foreground">Management Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {visibleNavGroups.map((group, gi) => (
          <div key={group.label} className={cn("mb-1", gi > 0 && "mt-2")}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:text-muted-foreground"
            >
              {group.label}
              <ChevronDown
                className={cn(
                  "size-3 transition-transform",
                  expandedGroups[group.label] === false && "-rotate-90"
                )}
              />
            </button>
            {expandedGroups[group.label] !== false && (
              <div className="space-y-0.5 mt-0.5">
                {group.items.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onLinkClick}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary border-l-2 border-primary pl-2.5"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <link.icon className="size-4 shrink-0" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 px-3 py-1.5 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{adminName}</span>
        </div>
        <div className="grid gap-1.5">
          <Link
            href={viewSiteHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onLinkClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" />
            View site
          </Link>
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
    </>
  );
}

function filterNavGroups(
  navGroups: NavGroup[],
  isSuperAdmin: boolean,
  userRoleRank: number,
  features: TenantFeature[]
) {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.superAdminOnly && !isSuperAdmin) return false;
        if (item.minRole && userRoleRank < ROLE_RANK[item.minRole]) return false;
        if (item.feature && !features.includes(item.feature)) return false;
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function AdminNav({
  adminName,
  role = "viewer",
  sites,
  currentSiteId,
  features = [],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  brandLogo: _brandLogo = "",
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

  const visibleNavGroups = filterNavGroups(NAV_GROUPS, isSuperAdmin, userRoleRank, features);

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background px-4 py-3 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <NavContent
                visibleNavGroups={visibleNavGroups}
                pathname={pathname}
                adminName={adminName}
                viewSiteHref={viewSiteHref}
              />
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{brandName || "Admino"}</p>
        </div>
        <SiteSelector sites={sites} currentSiteId={currentSiteId} />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar">
        <NavContent
          visibleNavGroups={visibleNavGroups}
          pathname={pathname}
          adminName={adminName}
          viewSiteHref={viewSiteHref}
        />
        {sites.length > 1 && (
          <div className="border-t p-3">
            <SiteSelector sites={sites} currentSiteId={currentSiteId} />
          </div>
        )}
      </aside>
    </>
  );
}
