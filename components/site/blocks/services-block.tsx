import { CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface Service {
  title: string;
  description?: string;
  icon?: string;
}

function parseServices(raw: unknown): Service[] {
  if (Array.isArray(raw)) return raw as Service[];
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function ServicesBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const services = parseServices(c.items);
  const badge = typeof c.badge === "string" ? c.badge : "";
  const title = typeof c.title === "string" ? c.title : "";
  const subtitle = typeof c.subtitle === "string" ? c.subtitle : "";

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {title || "Our Services"}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {services.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Card key={i} className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-6">
                <CheckCircle className="size-8 text-primary" />
                <h3 className="font-heading text-lg font-semibold">{s.title}</h3>
                {s.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No services configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
