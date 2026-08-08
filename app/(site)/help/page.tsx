import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, Mail, MapPin, Phone, LifeBuoy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getResolvedSiteSettings } from "@/lib/data";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResolvedSiteSettings();
  return {
    title: "Help",
    description: `How to order, book, and get help at ${settings.siteName}.`,
    openGraph: {
      title: `Help | ${settings.siteName}`,
      description: `Answers and contact details for ${settings.siteName}.`,
      type: "website",
    },
  };
}

export default async function HelpPage() {
  const settings = await getResolvedSiteSettings();
  if (settings.helpEnabled !== "true") notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
          We&apos;re here to help
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Help & Support
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Everything you need to know about ordering, booking, and getting in
          touch with {settings.siteName}.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading">How to order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Browse the products or menu, add the items you want to your cart, then check out when ready.</p>
            <p>At checkout you&apos;ll provide delivery or pickup details and choose a payment method. You&apos;ll get a confirmation once your order is placed.</p>
            <Link href="/menu" className="inline-block">
              <Button variant="outline" size="sm">View menu</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Bookings & reservations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Reserve a table or appointment using the booking form. Pick a date and time, enter your details, and we&apos;ll confirm your booking.</p>
            <Link href="/book" className="inline-block">
              <Button variant="outline" size="sm">Make a booking</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>We accept the payment methods listed during checkout — typically cards through Stripe and local wallets where supported.</p>
            <p>If you have a question about a specific payment, please reach out with your order details and we&apos;ll sort it out.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Order tracking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Check your order status any time from your account. If you checked out as a guest and have a question, contact us and we&apos;ll look it up.</p>
            <p className="flex items-center gap-2"><Phone className="size-4 text-primary" /> {settings.phone}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <LifeBuoy className="size-4 text-primary" /> Contact us
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <p className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{settings.address}</span>
          </p>
          {settings.phone && (
            <p className="flex items-start gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-primary" />
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:underline">
                {settings.phone}
              </a>
            </p>
          )}
          {settings.email && (
            <p className="flex items-start gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-primary" />
              <a href={`mailto:${settings.email}`} className="hover:underline">
                {settings.email}
              </a>
            </p>
          )}
          {settings.hours && (
            <p className="flex items-start gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{settings.hours}</span>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
