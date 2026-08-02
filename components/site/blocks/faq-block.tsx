import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface FaqItem {
  question: string;
  answer: string;
}

function parseFaqs(raw: string | null): FaqItem[] {
  if (!raw) return [];
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

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Frequently Asked Questions"}
        </h2>
        {c.subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>
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
          No FAQs configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
