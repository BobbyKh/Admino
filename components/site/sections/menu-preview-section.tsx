import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { MenuItem } from "@/lib/db/schema";

export function MenuPreviewSection({ items }: { items: MenuItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">Menu</p>
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Featured Items</h2>
        </div>
        <Link href="/menu" className="group flex items-center gap-2 text-sm font-medium text-primary hover:underline">Full menu<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((item) => (
          <Card key={item.id} className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
            {item.image && (<div className="relative h-40"><Image src={item.image} alt={item.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" /></div>)}
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold">{item.name}</h3>
                <span className="shrink-0 font-semibold text-primary">{item.price}</span>
              </div>
              {item.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{item.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
