import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Maiti Resort — Dining & Relaxation in Kirtipur, Nepal",
    template: "%s · Maiti Resort",
  },
  description:
    "Maiti Resort is a dining and relaxation venue in Kirtipur 44600, Nepal — open daily 10 AM–10 PM, serving breakfast, lunch, dinner, dessert, coffee, beer and wine. ★ 4.2 rated, 5 km from Balkhu.",
  keywords: [
    "Maiti Resort",
    "Kirtipur restaurant",
    "resort Kirtipur",
    "fast food Kirtipur",
    "restaurant Nepal",
    "dining Kathmandu",
  ],
  openGraph: {
    title: "Maiti Resort — Dining & Relaxation in Kirtipur",
    description:
      "A peaceful, scenic getaway just 5 km from Balkhu. Open daily 10 AM–10 PM. ★ 4.2",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
