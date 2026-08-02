function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface Stat {
  value: string;
  label: string;
}

function parseStats(raw: string | null): Stat[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function StatsBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const stats = parseStats(c.items);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "By the Numbers"}
        </h2>
      </div>
      {stats.length > 0 ? (
        <div className={`grid gap-8 sm:grid-cols-2 lg:grid-cols-${Math.min(stats.length, 4)}`}>
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-bold text-primary sm:text-5xl">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No stats configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
