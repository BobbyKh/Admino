import { MapPin, Clock, Phone } from "lucide-react";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function MapBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const query = c.query || c.address || "New York";
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Find Us"}
        </h2>
      </div>
      <div className="overflow-hidden rounded-2xl border">
        <iframe
          src={embedUrl}
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Map"
        />
      </div>
      {(c.address || c.hours || c.phone) && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {c.address && (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <MapPin className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{c.address}</p>
              </div>
            </div>
          )}
          {c.hours && (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Clock className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Hours</p>
                <p className="text-sm text-muted-foreground">{c.hours}</p>
              </div>
            </div>
          )}
          {c.phone && (
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Phone className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{c.phone}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
