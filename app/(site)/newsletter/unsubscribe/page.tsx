import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unsubscribeNewsletterToken } from "@/lib/actions/index";

export default async function UnsubscribeNewsletterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const unsubscribed = token ? await unsubscribeNewsletterToken(token) : false;
  return <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">{unsubscribed ? <CheckCircle2 className="size-12 text-primary" /> : <XCircle className="size-12 text-destructive" />}<h1 className="font-heading text-3xl font-semibold">{unsubscribed ? "You are unsubscribed" : "Unsubscribe link invalid"}</h1><p className="text-muted-foreground">{unsubscribed ? "You will no longer receive marketing emails from this store." : "This unsubscribe link could not be verified."}</p><Button asChild><Link href="/">Return to store</Link></Button></div>;
}
