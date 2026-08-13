"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Tags,
  Megaphone,
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
      { href: "/admin/commerce/promotions", label: "Promotions", icon: Tags, feature: "commerce" },
      { href: "/admin/commerce/marketing", label: "Email Marketing", icon: Megaphone, feature: "commerce" },
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
  sites,
  currentSiteId,
  viewSiteHref,
  onLinkClick,
}: {
  visibleNavGroups: ReturnType<typeof filterNavGroups>;
  pathname: string;
  adminName: string;
  sites: Site[];
  currentSiteId: number;
  viewSiteHref: string;
  onLinkClick?: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(label: string) {
    const group = visibleNavGroups.find((item) => item.label === label);
    const activeByDefault = group?.items.some((item) => isActive(pathname, item.href)) ?? false;
    setExpandedGroups((prev) => ({ ...prev, [label]: !(prev[label] ?? activeByDefault) }));
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

      <div className="border-b px-3 pb-3">
        <SiteSelector key={currentSiteId} sites={sites} currentSiteId={currentSiteId} />
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {visibleNavGroups.map((group, gi) => {
          const expanded = expandedGroups[group.label] ?? group.items.some((item) => isActive(pathname, item.href));
          const groupId = `admin-nav-${group.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <div key={group.label} className={cn("mb-1", gi > 0 && "mt-2")}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={expanded}
                aria-controls={groupId}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 transition-colors hover:bg-muted/70 hover:text-muted-foreground"
              >
                {group.label}
                <ChevronDown className={cn("size-3 transition-transform", !expanded && "-rotate-90")} />
              </button>
              {expanded && (
                <div id={groupId} className="mt-0.5 space-y-0.5">
                  {group.items.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={onLinkClick}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "border-l-2 border-primary bg-primary/10 pl-2.5 text-primary"
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
          );
        })}
      </nav>

      <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-2 px-3 py-1.5 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{adminName}</span>
        </div>
        <div className="grid gap-1.5">
          <Link
            href={viewSiteHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onLinkClick}
            className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ExternalLink className="size-4" />
            View site
          </Link>
          <form action={adminLogout}>
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isSuperAdmin = role === "super_admin";
  const userRoleRank = ROLE_RANK[role] ?? 0;
  const currentSite = sites.find((site) => site.id === currentSiteId);
  const viewSiteHref = currentSite ? `/api/admin/site-preview?siteId=${currentSite.id}` : "/";

  const visibleNavGroups = filterNavGroups(NAV_GROUPS, isSuperAdmin, userRoleRank, features);

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex min-h-16 w-full items-center gap-3 border-b bg-background/95 px-3 backdrop-blur sm:px-4 lg:hidden">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(88vw,20rem)] gap-0 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col">
              <NavContent
                visibleNavGroups={visibleNavGroups}
                pathname={pathname}
                adminName={adminName}
                sites={sites}
                currentSiteId={currentSiteId}
                viewSiteHref={viewSiteHref}
                onLinkClick={() => setMobileNavOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{brandName || "Admino"}</p>
          <p className="truncate text-xs text-muted-foreground">{currentSite?.name ?? "Active site"}</p>
        </div>
        <Button variant="ghost" size="icon" className="size-11 shrink-0" asChild>
          <Link href={viewSiteHref} target="_blank" rel="noopener noreferrer" aria-label="View active site">
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-68 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <NavContent
          visibleNavGroups={visibleNavGroups}
          pathname={pathname}
          adminName={adminName}
          sites={sites}
          currentSiteId={currentSiteId}
          viewSiteHref={viewSiteHref}
        />
      </aside>
    </>
  );
}
