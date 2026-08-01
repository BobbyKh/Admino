import Image from "next/image";

export function BannerSection({ config }: { config: Record<string, string> }) {
  if (!config.imageUrl) return null;
  return (
    <section className="relative w-full overflow-hidden" style={{ height: config.height || "400px" }}>
      <Image src={config.imageUrl} alt={config.alt || ""} fill className="object-cover" sizes="100vw" />
      {config.overlayText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <h2 className="font-heading text-3xl font-semibold text-white sm:text-5xl">{config.overlayText}</h2>
        </div>
      )}
    </section>
  );
}
