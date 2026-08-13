"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export type BulkOption = { value: string; label: string; destructive?: boolean };

export function BulkActionBar({ selectedCount, options, pending, onApply, onClear }: { selectedCount: number; options: BulkOption[]; pending: boolean; onApply: (action: string) => void; onClear: () => void }) {
  const [action, setAction] = React.useState(options[0]?.value ?? "");
  const [confirming, setConfirming] = React.useState(false);
  if (!selectedCount) return null;
  const option = options.find((item) => item.value === action);
  function apply() { if (option?.destructive) setConfirming(true); else onApply(action); }
  return <>
    <div className="mx-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3 sm:mx-6">
      <span className="mr-auto text-sm font-medium">{selectedCount} selected</span>
      <select value={action} onChange={(event) => setAction(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-sm" aria-label="Bulk action">{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
      <Button size="sm" variant={option?.destructive ? "destructive" : "default"} disabled={pending || !action} onClick={apply}>{pending && <Loader2 className="animate-spin" />}Apply</Button>
      <Button size="icon-sm" variant="ghost" onClick={onClear} aria-label="Clear selection"><X /></Button>
    </div>
    <AlertDialog open={confirming} onOpenChange={setConfirming}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Apply bulk action?</AlertDialogTitle><AlertDialogDescription>{option?.label} will be applied to {selectedCount} selected records. This may not be reversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setConfirming(false); onApply(action); }}>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
