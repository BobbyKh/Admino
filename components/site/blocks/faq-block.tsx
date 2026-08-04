import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

function parseConfig(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface FaqItem {
  question: string;
  answer: string;
}

function parseFaqs(raw: unknown): FaqItem[] {
  if (Array.isArray(raw)) return raw as FaqItem[];
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function FaqBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const faqs = parseFaqs(c.items);
  const badge = typeof c.badge === "string" ? c.badge : "";
  const title = typeof c.title === "string" ? c.title : "";
  const subtitle = typeof c.subtitle === "string" ? c.subtitle : "";

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {title || "Frequently Asked Questions"}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {faqs.length > 0 ? (
        <Accordion>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger value={`faq-${i}`}>{faq.question}</AccordionTrigger>
              <AccordionContent value={`faq-${i}`}>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No FAQs configured yet.
        </p>
      )}
    </section>
  );
}
