"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const AccordionContext = React.createContext<{ open: string | null; toggle: (v: string) => void }>({ open: null, toggle: () => {} });

export function Accordion({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <AccordionContext.Provider value={{ open, toggle: (v) => setOpen((p) => (p === v ? null : v)) }}>
      <div className={cn("divide-y rounded-lg border", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4", className)}>{children}</div>;
}

export function AccordionTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { open, toggle } = React.useContext(AccordionContext);
  const isOpen = open === value;
  return (
    <button
      type="button"
      onClick={() => toggle(value)}
      className={cn("flex w-full items-center justify-between py-4 text-sm font-medium hover:underline", className)}
    >
      {children}
      <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
    </button>
  );
}

export function AccordionContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { open } = React.useContext(AccordionContext);
  if (open !== value) return null;
  return <div className={cn("pb-4 text-sm text-muted-foreground", className)}>{children}</div>;
}
