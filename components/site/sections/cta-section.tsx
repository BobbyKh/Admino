import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteSettings } from "@/lib/settings";

export function CtaSection({ settings }: { settings: SiteSettings }) {
  const ctaPrimaryLink = settings.heroCtaPrimaryLink || "/";
  const ctaSecondaryLink = settings.heroCtaSecondaryLink || "/";

  return (
    <section className="relative isolate overflow-hidden">
      {settings.heroImage ? (
        <Image src={settings.heroImage} alt="" fill className="object-cover" sizes="100vw" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
      )}
      <div className="absolute inset-0 bg-primary/85" />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="font-heading text-3xl font-semibold text-primary-foreground sm:text-4xl">
          {settings.heroCtaPrimary || "Get Started"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
          {settings.heroSubtitle || "Take the next step today."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {settings.heroCtaPrimary && (
            <Link href={ctaPrimaryLink}>
              <Button size="lg" className="gap-2 bg-white text-primary hover:bg-white/90">
                {settings.heroCtaPrimary}
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
          {settings.heroCtaSecondary && (
            <Link href={ctaSecondaryLink}>
              <Button size="lg" variant="outline" className="gap-2 border-white/40 bg-transparent text-white hover:bg-white/10">
                {settings.heroCtaSecondary}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
