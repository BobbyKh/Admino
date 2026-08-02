import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContactForm } from "@/components/site/contact-form";
import { getResolvedSiteSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResolvedSiteSettings();
  return {
    title: "Contact Us",
    description: `Contact ${settings.siteName} at ${settings.address} — ${settings.phone}. Open ${settings.hours}. Send us a message or book your table.`,
    openGraph: {
      title: `Contact Us | ${settings.siteName}`,
      description: `Reach out to ${settings.siteName}. We'd love to hear from you.`,
      type: "website",
    },
  };
}

export default async function ContactPage() {
  const settings = await getResolvedSiteSettings();
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
    settings.mapQuery
  )}&output=embed`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
          Get in touch
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Contact Maiti Resort
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Questions, events or private gatherings — we&apos;d love to hear from
          you. Reach us by phone, email or the form below.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <Card className="h-fit">
          <CardContent className="p-6 sm:p-8">
            <ContactForm />
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Contact details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{settings.address}</span>
              </p>
              <p className="flex items-start gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:underline">
                  {settings.phone}
                </a>
              </p>
              <p className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
                <a href={`mailto:${settings.email}`} className="hover:underline">
                  {settings.email}
                </a>
              </p>
              <p className="flex items-start gap-3">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{settings.hours}</span>
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <iframe
              src={mapSrc}
              title={`Map of ${settings.siteName}`}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
