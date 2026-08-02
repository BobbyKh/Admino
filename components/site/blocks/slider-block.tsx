import Image from "next/image";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface Slide {
  image: string;
  title?: string;
  subtitle?: string;
  link?: string;
}

function parseSlides(raw: string | null): Slide[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function SliderBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const slides = parseSlides(c.items);
  const height = c.height || "500px";

  if (slides.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          No slides configured. Add items as JSON in the block config.
        </p>
      </section>
    );
  }

  return (
    <section className="relative w-full overflow-hidden" style={{ height }}>
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 opacity-0 animate-[fadeIn_12s_infinite] motion-reduce:animate-none"
          style={{
            animationDelay: `${i * 12 / slides.length}s`,
            zIndex: i === 0 ? 1 : 0,
          }}
        >
          <Image
            src={slide.image}
            alt={slide.title || `Slide ${i + 1}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority={i === 0}
          />
          <div className="absolute inset-0 bg-black/40" />
          {(slide.title || slide.subtitle) && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-white">
              <div className="px-4">
                {slide.title && <h2 className="font-heading text-4xl font-semibold sm:text-5xl">{slide.title}</h2>}
                {slide.subtitle && <p className="mt-4 text-lg text-white/80">{slide.subtitle}</p>}
              </div>
            </div>
          )}
        </div>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          0%, 100% { opacity: 0; }
          8%, 25% { opacity: 1; }
          33%, 100% { opacity: 0; }
        }
      `}} />
    </section>
  );
}
