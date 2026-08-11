import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { StorefrontProviders } from "@/components/site/storefront-providers";
import { getResolvedSiteSettings, getResolvedNavLinks } from "@/lib/data";
import { getResolvedSite } from "@/lib/site-context";
import { getLayoutSettings } from "@/lib/layout-settings";
import { getSiteLocales } from "@/lib/i18n";
import { notFound } from "next/navigation";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, settings, navLinks, locales] = await Promise.all([
    getResolvedSite(),
    getResolvedSiteSettings(),
    getResolvedNavLinks(),
    getSiteLocales(),
  ]);
  if (!site?.published) notFound();
  const layout = await getLayoutSettings(site.id);
  return (
    <StorefrontProviders siteId={site.id}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {layout.headerVisible && <Navbar settings={settings} navLinks={navLinks} sticky={layout.headerSticky} showLogo={layout.headerShowLogo} showSiteName={layout.headerShowSiteName} showCart={site.template === "ecommerce" && layout.headerShowCart} locales={locales} />}
      <main id="main-content" data-template={site.template} className="flex-1">{children}</main>
      {layout.footerVisible && <Footer settings={settings} navLinks={navLinks} layout={layout} />}
      {(settings.aiChatEnabled === "true" || settings.aiRagEnabled === "true") && settings.hasAiApiKey === "true" && (
        <ChatWidget siteName={settings.siteName} />
      )}
    </StorefrontProviders>
  );
}
