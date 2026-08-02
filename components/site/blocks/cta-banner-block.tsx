import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function CtaBannerBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <Card className="overflow-hidden bg-primary text-primary-foreground">
        <CardContent className="flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-12">
          {c.icon && <span className="text-4xl">{c.icon}</span>}
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
            {c.title || "Ready to Get Started?"}
          </h2>
          <p className="mx-auto max-w-xl text-primary-foreground/80">
            {c.subtitle || "Join thousands of satisfied customers today."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {c.buttonText && (
              <a
                href={c.buttonLink || "#"}
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-white/90"
              >
                {c.buttonText}
              </a>
            )}
            {c.button2Text && (
              <a
                href={c.button2Link || "#"}
                className="inline-flex items-center rounded-md border border-white/40 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                {c.button2Text}
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
