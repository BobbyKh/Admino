import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getResolvedSiteSettings } from "@/lib/data";

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
  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.description,
    openGraph: {
      title: settings.siteName,
      description: settings.description,
      type: "website",
      locale: "en_US",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getResolvedSiteSettings();
  const color = (value: string | undefined, fallback: string) => sanitizeCssColor(value, fallback);

  const themeCss = `
    :root {
      --primary: ${color(settings.themePrimary, "oklch(0.5 0.11 155)")};
      --primary-foreground: ${color(settings.themePrimaryForeground, "oklch(0.985 0 0)")};
      --secondary: ${color(settings.themeSecondary, "oklch(0.945 0.02 140)")};
      --secondary-foreground: ${color(settings.themeSecondaryForeground, "oklch(0.3 0.05 150)")};
      --accent: ${color(settings.themeAccent, "oklch(0.93 0.03 90)")};
      --accent-foreground: ${color(settings.themeAccentForeground, "oklch(0.3 0.06 90)")};
      --background: ${color(settings.themeBackground, "oklch(0.985 0.005 120)")};
      --foreground: ${color(settings.themeForeground, "oklch(0.16 0.02 145)")};
      --muted: ${color(settings.themeMuted, "oklch(0.955 0.01 140)")};
      --muted-foreground: ${color(settings.themeMutedForeground, "oklch(0.5 0.02 145)")};
      --border: ${color(settings.themeBorder, "oklch(0.9 0.015 140)")};
      --ring: ${color(settings.themeRing, "oklch(0.5 0.11 155)")};
      --destructive: ${color(settings.themeDestructive, "oklch(0.577 0.245 27.325)")};
      --card: ${color(settings.themeCard, "oklch(1 0 0)")};
      --card-foreground: ${color(settings.themeCardForeground, "oklch(0.16 0.02 145)")};
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

function sanitizeCssColor(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed.length > 80) return fallback;
  if (!/^[#a-zA-Z0-9\s.,%()+/-]+$/.test(trimmed)) return fallback;
  if (/url|expression|import|javascript/i.test(trimmed)) return fallback;
  return trimmed;
}
