"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTIONS = [
  { value: "create", label: "Created" },
  { value: "update", label: "Updated" },
  { value: "delete", label: "Deleted" },
  { value: "status_change", label: "Status Change" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
];

const ENTITIES = [
  { value: "settings", label: "Settings" },
  { value: "gallery", label: "Gallery" },
  { value: "menu_category", label: "Menu Category" },
  { value: "menu_item", label: "Menu Item" },
  { value: "booking", label: "Booking" },
  { value: "message", label: "Message" },
  { value: "page", label: "Page" },
  { value: "page_block", label: "Page Block" },
  { value: "site", label: "Site" },
  { value: "user", label: "User" },
  { value: "media", label: "Media" },
  { value: "navigation", label: "Navigation" },
  { value: "home_section", label: "Home Section" },
];

export function ActivityLogFilters({
  currentAction,
  currentEntity,
}: {
  currentAction?: string;
  currentEntity?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams();
    if (key !== "action" && currentAction) params.set("action", currentAction);
    if (key !== "entity" && currentEntity) params.set("entity", currentEntity);
    if (value && value !== "all") params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-2">
      <Select
        value={currentAction ?? "all"}
        onValueChange={(v) => updateFilter("action", v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Actions</SelectItem>
          {ACTIONS.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentEntity ?? "all"}
        onValueChange={(v) => updateFilter("entity", v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Entities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Entities</SelectItem>
          {ENTITIES.map((e) => (
            <SelectItem key={e.value} value={e.value}>
              {e.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
