import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SiteSettings } from "@/lib/settings";

export function AboutSection({ settings }: { settings: SiteSettings }) {
  return (
    <section className="bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <div className="relative">
          <Image src={settings.aboutImage} alt={settings.aboutTitle} width={1200} height={900} className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg" />
          <div className="absolute -bottom-5 -right-4 hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg sm:block">
            <p className="font-heading text-3xl font-semibold">{settings.rating}★</p>
            <p className="text-sm opacity-90">{settings.reviewCount} reviews</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">About Us</p>
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">{settings.aboutTitle}</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">{settings.aboutText}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {settings.services.slice(0, 8).map((s) => (<Badge key={s} variant="secondary" className="gap-1.5"><Leaf className="size-3" />{s}</Badge>))}
          </div>
          <Link href="/book" className="mt-8 inline-block"><Button size="lg" className="gap-2">Book Your Visit<ArrowRight className="size-4" /></Button></Link>
        </div>
      </div>
    </section>
  );
}
