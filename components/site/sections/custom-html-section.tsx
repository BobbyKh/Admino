import { sanitizeHtml } from "@/lib/sanitize";

export function CustomHtmlSection({ config }: { config: Record<string, string> }) {
  if (!config.html) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(config.html) }} />
    </section>
  );
}
