import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat-widget";
import { getSiteSettings, getNavLinks } from "@/lib/data";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, navLinks] = await Promise.all([
    getSiteSettings(),
    getNavLinks(),
  ]);
  return (
    <>
      <Navbar settings={settings} navLinks={navLinks} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} navLinks={navLinks} />
      {settings.aiChatEnabled === "true" && settings.hasAiApiKey === "true" && (
        <ChatWidget siteName={settings.siteName} />
      )}
    </>
  );
}
