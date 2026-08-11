import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getResolvedSiteSettings } from "@/lib/data";
import { buildThemeCss } from "@/lib/theme-css";

export const dynamic = "force-dynamic";

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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResolvedSiteSettings();
  const icon = settings.favicon || settings.logo;
  return {
    applicationName: settings.siteName,
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.description,
    icons: icon ? {
      icon,
      shortcut: icon,
      apple: icon,
    } : undefined,
    openGraph: {
      title: settings.siteName,
      description: settings.description,
      type: "website",
      locale: "en_US",
      images: settings.logo ? [{ url: settings.logo, alt: settings.siteName }] : undefined,
    },
    twitter: {
      card: settings.logo ? "summary_large_image" : "summary",
      title: settings.siteName,
      description: settings.description,
      images: settings.logo ? [settings.logo] : undefined,
    },
    appleWebApp: {
      title: settings.siteName,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getResolvedSiteSettings();
  const themeCss = buildThemeCss(settings);

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
