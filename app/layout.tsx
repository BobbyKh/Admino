import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getSiteSettings } from "@/lib/data";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  const themeCss = `
    :root {
      --primary: ${settings.themePrimary || "oklch(0.5 0.11 155)"};
      --primary-foreground: ${settings.themePrimaryForeground || "oklch(0.985 0 0)"};
      --secondary: ${settings.themeSecondary || "oklch(0.945 0.02 140)"};
      --secondary-foreground: ${settings.themeSecondaryForeground || "oklch(0.3 0.05 150)"};
      --accent: ${settings.themeAccent || "oklch(0.93 0.03 90)"};
      --accent-foreground: ${settings.themeAccentForeground || "oklch(0.3 0.06 90)"};
      --background: ${settings.themeBackground || "oklch(0.985 0.005 120)"};
      --foreground: ${settings.themeForeground || "oklch(0.16 0.02 145)"};
      --muted: ${settings.themeMuted || "oklch(0.955 0.01 140)"};
      --muted-foreground: ${settings.themeMutedForeground || "oklch(0.5 0.02 145)"};
      --border: ${settings.themeBorder || "oklch(0.9 0.015 140)"};
      --ring: ${settings.themeRing || "oklch(0.5 0.11 155)"};
      --destructive: ${settings.themeDestructive || "oklch(0.577 0.245 27.325)"};
      --card: ${settings.themeCard || "oklch(1 0 0)"};
      --card-foreground: ${settings.themeCardForeground || "oklch(0.16 0.02 145)"};
    }
  `;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
