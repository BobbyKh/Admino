"use client";

import * as React from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectionCheckbox } from "@/components/admin/selection-checkbox";
import { useRowSelection } from "@/components/admin/use-row-selection";

type ContextValue = ReturnType<typeof useRowSelection>;
const ExportContext = React.createContext<ContextValue | null>(null);

export function BulkExportScope<T extends { id: number }>({ rows, filename, children }: { rows: T[]; filename: string; children: React.ReactNode }) {
  const selection = useRowSelection(rows.map((row) => row.id));
  function download() {
    const selected = rows.filter((row) => selection.selected.has(row.id));
    if (!selected.length) return;
    const keys = [...new Set(selected.flatMap((row) => Object.keys(row)))];
    const csv = [keys, ...selected.map((row) => keys.map((key) => serialize((row as Record<string, unknown>)[key])))].map((values) => values.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
    selection.clear();
  }
  return <ExportContext.Provider value={selection}>{selection.selectedCount > 0 && <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3"><span className="mr-auto text-sm font-medium">{selection.selectedCount} selected</span><Button size="sm" variant="outline" onClick={download}><Download />Export CSV</Button><Button size="icon-sm" variant="ghost" onClick={selection.clear} aria-label="Clear selection"><X /></Button></div>}{children}</ExportContext.Provider>;
}

export function ExportRowCheckbox({ id, label }: { id: number; label: string }) { const selection = useExportSelection(); return <SelectionCheckbox checked={selection.selected.has(id)} onChange={() => selection.toggle(id)} label={label} />; }
export function ExportSelectAll({ label = "Select all visible records" }: { label?: string }) { const selection = useExportSelection(); return <SelectionCheckbox checked={selection.allSelected} indeterminate={selection.someSelected} onChange={selection.toggleAll} label={label} />; }
function useExportSelection() { const value = React.useContext(ExportContext); if (!value) throw new Error("Export controls require BulkExportScope."); return value; }
function serialize(value: unknown) { if (value == null) return ""; return typeof value === "object" ? JSON.stringify(value) : String(value); }
