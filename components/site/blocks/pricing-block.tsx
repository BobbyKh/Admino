import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function parseConfig(raw: string | null): Record<string, string> {
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

function parsePlans(raw: string | null): PricingPlan[] {
  if (!raw) return [];
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

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Pricing Plans"}
        </h2>
        {c.subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>
        )}
      </div>
      {plans.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => (
            <Card
              key={i}
              className={`relative h-full transition-all ${
                plan.highlighted
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "hover:-translate-y-0.5 hover:shadow-md"
              }`}
            >
              {plan.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="font-heading text-xl">{plan.name}</CardTitle>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">/{plan.period}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex-1 space-y-2.5">
                  {plan.features?.map((f, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
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
          No pricing plans configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
