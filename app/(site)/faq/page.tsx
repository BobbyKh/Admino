import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { getResolvedSiteSettings } from "@/lib/data";

export const revalidate = 300;

function parseFaqs(raw: string): Array<{ question: string; answer: string }> {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore */
  }
  return [];
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getResolvedSiteSettings();
  return {
    title: "FAQ",
    description: `Frequently asked questions about ${settings.siteName}.`,
    openGraph: {
      title: `FAQ | ${settings.siteName}`,
      description: `Answers to common questions about ${settings.siteName}.`,
      type: "website",
    },
  };
}

export default async function FaqPage() {
  const settings = await getResolvedSiteSettings();
  if (settings.faqEnabled !== "true") notFound();

  const faqs = parseFaqs(settings.faqItems);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">
          Questions, answered
        </p>
        <h1 className="font-heading text-4xl font-semibold sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          The most common questions about {settings.siteName}. Can&apos;t find
          your answer? Head over to our help page or contact us.
        </p>
      </div>

      {faqs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center text-muted-foreground">
          <HelpCircle className="mb-3 size-10 opacity-40" />
          <p className="text-sm">No FAQs configured yet.</p>
        </div>
      ) : (
        <Accordion>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger value={`faq-${i}`}>{faq.question}</AccordionTrigger>
              <AccordionContent value={`faq-${i}`}>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
