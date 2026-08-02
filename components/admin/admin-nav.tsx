"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Blocks,
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
  Settings,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { adminLogout } from "@/lib/actions";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Builder",
    items: [
      { href: "/admin/sites", label: "Sites", icon: Globe },
      { href: "/admin/pages", label: "Pages", icon: FileText },
      { href: "/admin/navigation", label: "Navigation", icon: LinkIcon },
      { href: "/admin/homepage", label: "Legacy Sections", icon: Blocks },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/admin/messages", label: "Messages", icon: Mail },
      { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
      { href: "/admin/gallery", label: "Gallery", icon: Images },
    ],
  },
  {
    label: "Assets",
    items: [
      { href: "/admin/media", label: "Media Library", icon: FolderInput },
    ],
  },
  {
    label: "Configuration",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/users", label: "Users", icon: Users },
    ],
  },
];

export function AdminNav({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <UtensilsCrossed className="size-4" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Maiti Resort</p>
          <p className="text-xs text-muted-foreground">Admin panel</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group, gi) => (
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
