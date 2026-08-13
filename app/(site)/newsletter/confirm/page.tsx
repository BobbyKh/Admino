import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmNewsletterToken } from "@/lib/actions/index";

export default async function ConfirmNewsletterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const confirmed = token ? await confirmNewsletterToken(token) : false;
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">{confirmed ? <CheckCircle2 className="size-12 text-primary" /> : <XCircle className="size-12 text-destructive" />}<h1 className="font-heading text-3xl font-semibold">{confirmed ? "Subscription confirmed" : "Confirmation link invalid"}</h1><p className="text-muted-foreground">{confirmed ? "You will now receive store news and product updates." : "This link may be invalid or expired. Subscribe again to request a new link."}</p><Button asChild><Link href="/">Return to store</Link></Button></div>;
}
