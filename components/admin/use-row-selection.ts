"use client";

import * as React from "react";

export function useRowSelection(visibleIds: readonly number[]) {
  const [selected, setSelected] = React.useState<Set<number>>(() => new Set());
  const visibleSet = React.useMemo(() => new Set(visibleIds), [visibleIds]);
  const selectedIds = React.useMemo(() => [...selected].filter((id) => visibleSet.has(id)), [selected, visibleSet]);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  function toggle(id: number) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleAll() { setSelected((current) => { const next = new Set(current); if (allSelected) visibleIds.forEach((id) => next.delete(id)); else visibleIds.forEach((id) => next.add(id)); return next; }); }
  function clear() { setSelected(new Set()); }
  return { selected, selectedIds, selectedCount: selectedIds.length, allSelected, someSelected: selectedIds.length > 0 && !allSelected, toggle, toggleAll, clear };
}
