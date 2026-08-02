import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface Testimonial {
  name: string;
  role?: string;
  text: string;
  rating?: number;
}

function parseTestimonials(raw: string | null): Testimonial[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function TestimonialBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const testimonials = parseTestimonials(c.items);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "What People Say"}
        </h2>
      </div>
      {testimonials.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Card key={i} className="h-full">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                {t.rating && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`size-4 ${s < t.rating! ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                      />
                    ))}
                  </div>
                )}
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 border-t pt-4">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {t.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.role && <p className="text-xs text-muted-foreground">{t.role}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No testimonials configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
