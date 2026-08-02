function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface TimelineItem {
  title: string;
  description?: string;
  date?: string;
}

function parseItems(raw: string | null): TimelineItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function TimelineBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const items = parseItems(c.items);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Our Timeline"}
        </h2>
      </div>
      {items.length > 0 ? (
        <div className="relative space-y-8">
          <div className="absolute left-4 top-0 h-full w-px bg-border" />
          {items.map((item, i) => (
            <div key={i} className="relative flex gap-6">
              <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold text-primary">
                {i + 1}
              </div>
              <div className="flex-1 pt-1">
                {item.date && (
                  <p className="mb-1 text-xs font-medium text-primary">{item.date}</p>
                )}
                <h3 className="font-heading font-semibold">{item.title}</h3>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No timeline items configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
