"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runBulkAction } from "@/lib/actions/bulk";
import { BulkActionBar, type BulkOption } from "@/components/admin/bulk-action-bar";
import { SelectionCheckbox } from "@/components/admin/selection-checkbox";
import { useRowSelection } from "@/components/admin/use-row-selection";

type BulkEntity = "products" | "blog" | "promotions" | "messages" | "bookings" | "navigation" | "homepage" | "menu" | "services" | "webhooks" | "campaigns" | "orders" | "pages" | "gallery" | "errors" | "experiments" | "funnels";
type ContextValue = ReturnType<typeof useRowSelection>;
const SelectionContext = React.createContext<ContextValue | null>(null);

export function BulkSelectionScope({ siteId, entity, ids, options, children }: { siteId: number; entity: BulkEntity; ids: number[]; options: BulkOption[]; children: React.ReactNode }) {
  const selection = useRowSelection(ids);
  const [pending, startTransition] = React.useTransition();
  const router = useRouter();
  function apply(action: string) {
    startTransition(async () => {
      try {
        const result = await runBulkAction({ siteId, entity, action, ids: selection.selectedIds });
        if (result.failed) toast.warning(`${result.succeeded} updated, ${result.failed} skipped.`, { description: result.results.filter((item) => !item.success).slice(0, 3).map((item) => `#${item.id}: ${item.message}`).join(" · ") });
        else toast.success(`${result.succeeded} record${result.succeeded === 1 ? "" : "s"} updated.`);
        selection.clear();
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Bulk action failed."); }
    });
  }
  return <SelectionContext.Provider value={selection}><BulkActionBar selectedCount={selection.selectedCount} options={options} pending={pending} onApply={apply} onClear={selection.clear} />{children}</SelectionContext.Provider>;
}

export function BulkRowCheckbox({ id, label }: { id: number; label: string }) {
  const selection = useSelection();
  return <SelectionCheckbox checked={selection.selected.has(id)} onChange={() => selection.toggle(id)} label={label} />;
}

export function BulkSelectAll({ label = "Select all visible records" }: { label?: string }) {
  const selection = useSelection();
  return <SelectionCheckbox checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} label={label} />;
}

function useSelection() { const value = React.useContext(SelectionContext); if (!value) throw new Error("Bulk selection controls require BulkSelectionScope."); return value; }
