"use client";

import * as React from "react";
import { CheckCircle } from "lucide-react";
import type { Service, ServiceCategory } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function ServiceGridBlock({ config, categories, services }: { config: string | null; categories: ServiceCategory[]; services: Service[] }) {
  const c = parseConfig(config);
  const [categoryId, setCategoryId] = React.useState(c.categoryId || "all");
  const limit = Math.max(1, Number(c.limit) || 6);
  const filteredServices = services
    .filter((service) => c.source !== "featured" || service.featured)
    .filter((service) => categoryId === "all" || service.categoryId === Number(categoryId))
    .slice(0, limit);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{c.title || "Our Services"}</h2>
        {c.subtitle && <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>}
      </div>
      {categories.length > 0 && (
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setCategoryId("all")} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition-colors", categoryId === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")}>All services</button>
          {categories.map((category) => <button type="button" key={category.id} onClick={() => setCategoryId(String(category.id))} className={cn("rounded-full border px-4 py-1.5 text-sm font-medium transition-colors", categoryId === String(category.id) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground")}>{category.name}</button>)}
        </div>
      )}
      {filteredServices.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filteredServices.map((service) => <Card key={service.id} className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">{service.image && (/* Service images may come from any tenant media host. */
        // eslint-disable-next-line @next/next/no-img-element
        <img src={service.image} alt={service.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />)}<CardContent className="flex flex-col gap-3 p-6"><CheckCircle className="size-8 text-primary" /><h3 className="font-heading text-lg font-semibold">{service.title}</h3>{service.description && <p className="text-sm leading-relaxed text-muted-foreground">{service.description}</p>}</CardContent></Card>)}</div> : <p className="text-center text-sm text-muted-foreground">No services are available in this category yet.</p>}
    </section>
  );
}
