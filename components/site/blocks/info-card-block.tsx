import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, DollarSign, Star, Users, Wifi, Coffee, Car } from "lucide-react";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function InfoCardBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Quick Info"}
        </h2>
      </div>
      <Card className="mx-auto max-w-2xl">
        <CardContent className="divide-y p-0">
          {c.hours && (
            <div className="flex items-center gap-4 px-6 py-4">
              <Clock className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Hours</p>
                <p className="text-sm text-muted-foreground">{c.hours}</p>
              </div>
            </div>
          )}
          {c.location && (
            <div className="flex items-center gap-4 px-6 py-4">
              <MapPin className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">{c.location}</p>
              </div>
            </div>
          )}
          {c.price && (
            <div className="flex items-center gap-4 px-6 py-4">
              <DollarSign className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Price Range</p>
                <p className="text-sm text-muted-foreground">{c.price}</p>
              </div>
            </div>
          )}
          {c.rating && (
            <div className="flex items-center gap-4 px-6 py-4">
              <Star className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Rating</p>
                <p className="text-sm text-muted-foreground">{c.rating}</p>
              </div>
            </div>
          )}
          {c.capacity && (
            <div className="flex items-center gap-4 px-6 py-4">
              <Users className="size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Capacity</p>
                <p className="text-sm text-muted-foreground">{c.capacity}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
