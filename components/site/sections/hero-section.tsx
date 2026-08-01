import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, MapPin, Phone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SiteSettings } from "@/lib/settings";

export function HeroSection({ settings }: { settings: SiteSettings }) {
  return (
    <section className="relative isolate overflow-hidden">
      <Image src={settings.heroImage} alt={settings.heroTitle} fill priority className="object-cover" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
      <div className="relative mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <Badge className="mb-5 w-fit gap-2 bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
            <Clock className="size-3.5" />
            {settings.heroBadge || settings.hours}
          </Badge>
          <p className="mb-3 text-sm font-medium tracking-widest text-emerald-300 uppercase">{settings.tagline}</p>
          <h1 className="font-heading text-4xl leading-tight font-semibold text-white sm:text-6xl">{settings.heroTitle}</h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{settings.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/book"><Button size="lg" className="gap-2"><CalendarDays className="size-4" />{settings.heroCtaPrimary || "Reserve a Table"}</Button></Link>
            <Link href="/menu"><Button size="lg" variant="outline" className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10">{settings.heroCtaSecondary || "View Menu"}<ArrowRight className="size-4" /></Button></Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/90">
            <span className="flex items-center gap-2"><Star className="size-4 fill-amber-400 text-amber-400" />{settings.rating} · {settings.reviewCount} reviews</span>
            <span className="flex items-center gap-2"><MapPin className="size-4 text-emerald-300" />{settings.address} · 5 km from Balkhu</span>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:underline"><Phone className="size-4 text-emerald-300" />{settings.phone}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
