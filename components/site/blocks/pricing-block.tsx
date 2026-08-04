import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface PricingPlan {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features?: string[];
  highlighted?: boolean;
  buttonText?: string;
  buttonLink?: string;
}

function parsePlans(raw: unknown): PricingPlan[] {
  if (Array.isArray(raw)) return raw as PricingPlan[];
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function PricingBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const plans = parsePlans(c.items);
  const badge = typeof c.badge === "string" ? c.badge : "";
  const title = typeof c.title === "string" ? c.title : "";
  const subtitle = typeof c.subtitle === "string" ? c.subtitle : "";

  return (
    <section className="bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-12 text-center">
        {badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {title || "Pricing Plans"}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {plans.length > 0 ? (
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {plans.map((plan, i) => (
            <Card
              key={i}
              className={`relative flex h-full flex-col overflow-visible transition-all ${
                plan.highlighted
                  ? "border-primary bg-primary text-primary-foreground shadow-xl ring-4 ring-primary/15 md:-translate-y-3"
                  : "bg-background hover:-translate-y-1 hover:shadow-lg"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 border-0 bg-foreground text-background">Most Popular</Badge>
              )}
              <CardHeader className="pb-4 text-center">
                <CardTitle className="font-heading text-2xl">{plan.name}</CardTitle>
                {plan.description && (
                  <p className={plan.highlighted ? "text-sm text-primary-foreground/75" : "text-sm text-muted-foreground"}>{plan.description}</p>
                )}
                <div className="mt-5 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-semibold tracking-tight">{plan.price}</span>
                  {plan.period && (
                    <span className={plan.highlighted ? "text-sm text-primary-foreground/75" : "text-sm text-muted-foreground"}>/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6 pt-2">
                <ul className="flex-1 space-y-3">
                  {plan.features?.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm">
                      <Check className={plan.highlighted ? "mt-0.5 size-4 shrink-0 text-primary-foreground" : "mt-0.5 size-4 shrink-0 text-primary"} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "secondary" : "outline"}
                  asChild={!!plan.buttonLink}
                >
                  {plan.buttonLink ? (
                    <a href={plan.buttonLink}>{plan.buttonText || "Choose Plan"}</a>
                  ) : (
                    <span>{plan.buttonText || "Choose Plan"}</span>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No pricing plans configured yet.
        </p>
      )}
      </div>
    </section>
  );
}
