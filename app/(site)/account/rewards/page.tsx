import { redirect } from "next/navigation";
import { Gift, History } from "lucide-react";
import { getCustomerLoyalty } from "@/lib/actions/customers";
import { getSessionCustomer } from "@/lib/customer-auth";

export default async function RewardsPage() {
  const customer = await getSessionCustomer();
  if (!customer) redirect("/account/login");
  const rewards = await getCustomerLoyalty();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Rewards</h2>
        <p className="text-sm text-muted-foreground">Earn one point for every whole currency unit on delivered orders.</p>
      </div>
      <div className="rounded-lg border bg-primary/5 p-6">
        <Gift className="mb-3 size-6 text-primary" />
        <p className="text-3xl font-bold">{rewards.balance.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Available points</p>
      </div>
      <section className="space-y-3">
        <div className="flex items-center gap-2"><History className="size-4 text-primary" /><h3 className="font-semibold">Points history</h3></div>
        {rewards.entries.length === 0 ? <div className="rounded-lg border py-10 text-center text-sm text-muted-foreground">Complete an order to start earning points.</div> : rewards.entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div><p className="font-medium">{entry.reason}</p><p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</p></div>
            <p className="font-semibold text-primary">{entry.pointsDelta > 0 ? "+" : ""}{entry.pointsDelta}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
