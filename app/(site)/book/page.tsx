import type { Metadata } from "next";
import { Clock, MapPin, Phone, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingForm } from "@/components/site/booking-form";
import { getResolvedSiteSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResolvedSiteSettings();
  return {
    title: "Book a Table",
    description: `Reserve your table at ${settings.siteName}. Open ${settings.hours}, ${settings.priceRange} per person. Family friendly with outdoor seating.`,
    openGraph: {
      title: `Book a Table | ${settings.siteName}`,
      description: `Reserve your table at ${settings.siteName}. ${settings.priceRange} per person.`,
      type: "website",
    },
  };
}

export default async function BookPage() {
  const settings = await getResolvedSiteSettings();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
          Reservations
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Book a Table
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Reserve your table for any occasion — casual dining, family
          gatherings, birthdays or business meetings. We&apos;ll confirm your
          booking by email shortly.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Card className="h-fit">
          <CardContent className="p-6 sm:p-8">
            <BookingForm />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Visit info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{settings.hours}</span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{settings.address} · 5 km from Balkhu</span>
              </p>
              <p className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {settings.phone}
                </a>
              </p>
              <p className="flex items-start gap-3">
                <Star className="mt-0.5 size-4 shrink-0 fill-amber-400 text-amber-400" />
                <span>
                  Rated {settings.rating} · {settings.priceRange} per person
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Good to know</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {settings.services.map((service) => (
                  <li key={service} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {service}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
