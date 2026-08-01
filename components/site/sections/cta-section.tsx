import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteSettings } from "@/lib/settings";

export function CtaSection({ settings }: { settings: SiteSettings }) {
  return (
    <section className="relative isolate overflow-hidden">
      <Image src={settings.heroImage} alt="" fill className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-primary/85" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-heading text-3xl font-semibold text-primary-foreground sm:text-4xl">Plan your visit today</h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">{settings.priceRange} per person · {settings.hours}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/book"><Button size="lg" className="gap-2 bg-white text-primary hover:bg-white/90"><CalendarDays className="size-4" />Reserve a Table</Button></Link>
          <a href={`tel:${settings.phone.replace(/\s/g, "")}`}><Button size="lg" variant="outline" className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10"><Phone className="size-4" />{settings.phone}</Button></a>
        </div>
      </div>
    </section>
  );
}
