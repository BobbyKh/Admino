import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; site?: string }>;
}) {
  const { session_id, site } = await searchParams;
  const homeHref = site ? `/?site=${encodeURIComponent(site)}` : "/";

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <CheckCircle2 className="size-12 text-primary" />
      <h1 className="font-heading text-3xl font-semibold">Payment confirmed</h1>
      <p className="text-muted-foreground">
        Thank you for your order. A confirmation email will be sent shortly.
        {session_id && (
          <span className="mt-2 block text-xs text-muted-foreground">
            Session: {session_id.slice(0, 20)}...
          </span>
        )}
      </p>
      <Button asChild>
        <Link href={homeHref}>Continue shopping</Link>
      </Button>
    </div>
  );
}
