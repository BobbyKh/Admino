import { sanitizeHtml } from "@/lib/sanitize";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function RichTextBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const html = c.html || c.content || "";

  if (!html) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-center text-sm text-muted-foreground">
          No content configured. Add HTML content in the block config.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    </section>
  );
}
