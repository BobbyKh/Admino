import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Coffee,
  Heart,
  Leaf,
  MapPin,
  Phone,
  SquareParking,
  Star,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getFeaturedItems, getGallery, getSiteSettings } from "@/lib/data";
import type { Feature } from "@/lib/settings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Maiti Resort — Dining & Relaxation in Kirtipur, Nepal",
  description:
    "A peaceful, scenic dining getaway just 5 km from Balkhu. Open daily 10 AM–10 PM. Breakfast, lunch, dinner, dessert, coffee, beer & wine. ★ 4.2 rated resort in Kirtipur 44600, Nepal.",
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  leaf: Leaf,
  sun: Sun,
  users: Users,
  parking: SquareParking,
  coffee: Coffee,
  heart: Heart,
  star: Star,
  home: Leaf,
};

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = ICONS[feature.icon] ?? Leaf;
  return (
    <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full flex-col items-start gap-3 p-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <h3 className="font-heading text-lg font-semibold">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {feature.text}
        </p>
      </CardContent>
    </Card>
  );
}

export default async function HomePage() {
  const [settings, gallery, featured] = await Promise.all([
    getSiteSettings(),
    getGallery(),
    getFeaturedItems(),
  ]);

  const heroImages = gallery.slice(0, 6);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: settings.siteName,
    image: settings.heroImage,
    telephone: settings.phone,
    address: { "@type": "PostalAddress", addressLocality: "Kirtipur", postalCode: "44600", addressCountry: "NP" },
    priceRange: settings.priceRange,
    servesCuisine: ["Fast Food", "Nepali", "Continental"],
    aggregateRating: { "@type": "AggregateRating", ratingValue: settings.rating, reviewCount: settings.reviewCount },
    openingHours: "Mo-Su 10:00-22:00",
    url: process.env.SITE_URL ?? "http://localhost:3000",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={settings.heroImage}
          alt={settings.heroTitle}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
        <div className="relative mx-auto flex min-h-[88svh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <Badge className="mb-5 w-fit gap-2 bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
              <Clock className="size-3.5" />
              {settings.heroBadge || settings.hours}
            </Badge>
            <p className="mb-3 text-sm font-medium tracking-widest text-emerald-300 uppercase">
              {settings.tagline}
            </p>
            <h1 className="font-heading text-4xl leading-tight font-semibold text-white sm:text-6xl">
              {settings.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              {settings.heroSubtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/book">
                <Button size="lg" className="gap-2">
                  <CalendarDays className="size-4" />
                  {settings.heroCtaPrimary || "Reserve a Table"}
                </Button>
              </Link>
              <Link href="/menu">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  {settings.heroCtaSecondary || "View Menu"}
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/90">
              <span className="flex items-center gap-2">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {settings.rating} · {settings.reviewCount} reviews
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-4 text-emerald-300" />
                {settings.address} · 5 km from Balkhu
              </span>
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:underline">
                <Phone className="size-4 text-emerald-300" />
                {settings.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
            Why Maiti Resort
          </p>
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
            A getaway that has it all
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {settings.features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </section>

      {/* About */}
      <section className="bg-muted/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div className="relative">
            <Image
              src={settings.aboutImage}
              alt={settings.aboutTitle}
              width={1200}
              height={900}
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-lg"
            />
            <div className="absolute -bottom-5 -right-4 hidden rounded-2xl bg-primary p-5 text-primary-foreground shadow-lg sm:block">
              <p className="font-heading text-3xl font-semibold">{settings.rating}★</p>
              <p className="text-sm opacity-90">{settings.reviewCount} reviews</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
              About Us
            </p>
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              {settings.aboutTitle}
            </h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              {settings.aboutText}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {settings.services.slice(0, 8).map((service) => (
                <Badge key={service} variant="secondary" className="gap-1.5">
                  <Leaf className="size-3" />
                  {service}
                </Badge>
              ))}
            </div>
            <Link href="/book" className="mt-8 inline-block">
              <Button size="lg" className="gap-2">
                Book Your Visit
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Menu preview */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
              Our Menu
            </p>
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
              Guest favourites
            </h2>
          </div>
          <Link href="/menu" className="group flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Full menu
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 4).map((item) => (
            <Card key={item.id} className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md">
              {item.image && (
                <div className="relative h-40">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                </div>
              )}
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading font-semibold">{item.name}</h3>
                  <span className="shrink-0 font-semibold text-primary">
                    NPR {item.price}
                  </span>
                </div>
                {item.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Gallery preview */}
      {heroImages.length > 0 && (
        <section className="bg-muted/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
                  Gallery
                </p>
                <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
                  Moments at Maiti Resort
                </h2>
              </div>
              <Link href="/gallery" className="group flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                View all photos
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {heroImages.map((img, i) => (
                <Link
                  key={img.id}
                  href="/gallery"
                  className={`group relative overflow-hidden rounded-xl ${
                    i === 0 ? "col-span-2 row-span-2 md:col-span-1" : ""
                  }`}
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={800}
                    height={600}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative isolate overflow-hidden">
        <Image
          src={settings.heroImage}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-primary/85" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-semibold text-primary-foreground sm:text-4xl">
            Plan your visit today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            {settings.priceRange} per person · {settings.hours}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/book">
              <Button size="lg" className="gap-2 bg-white text-primary hover:bg-white/90">
                <CalendarDays className="size-4" />
                Reserve a Table
              </Button>
            </Link>
            <a href={`tel:${settings.phone.replace(/\s/g, "")}`}>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                <Phone className="size-4" />
                {settings.phone}
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
