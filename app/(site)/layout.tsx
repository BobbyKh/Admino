import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { getResolvedSiteSettings, getResolvedNavLinks } from "@/lib/data";
import { getResolvedSite } from "@/lib/site-context";
import { notFound } from "next/navigation";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, settings, navLinks] = await Promise.all([
    getResolvedSite(),
    getResolvedSiteSettings(),
    getResolvedNavLinks(),
  ]);
  if (!site?.published) notFound();
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Navbar settings={settings} navLinks={navLinks} />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer settings={settings} navLinks={navLinks} />
      {settings.aiChatEnabled === "true" && settings.hasAiApiKey === "true" && (
        <ChatWidget siteName={settings.siteName} />
      )}
    </>
  );
}
