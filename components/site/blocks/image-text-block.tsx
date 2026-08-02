import Image from "next/image";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function ImageTextBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const layout = c.layout || "left";

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div
        className={`grid items-center gap-10 ${
          layout === "right" ? "lg:grid-cols-[1fr_1.2fr]" : "lg:grid-cols-[1.2fr_1fr]"
        }`}
        style={layout === "right" ? { direction: "rtl" } : undefined}
      >
        {c.image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <Image
              src={c.image}
              alt={c.title || ""}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        )}
        <div style={layout === "right" ? { direction: "ltr" } : undefined}>
          {c.badge && (
            <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
              {c.badge}
            </p>
          )}
          <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
            {c.title || "Add a Title"}
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            {c.text || "Add your text content here. This block is perfect for about sections, feature descriptions, or any content that pairs well with an image."}
          </p>
          {c.buttonText && (
            <a
              href={c.buttonLink || "#"}
              className="mt-6 inline-block rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {c.buttonText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
