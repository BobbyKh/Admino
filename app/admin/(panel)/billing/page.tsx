"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Trash2, CreditCard, Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPlans,
  adminCreatePlan,
  adminDeletePlan,
  getAllSubscriptions,
  getCurrentSubscription,
  subscribeToPlan,
  manageSubscription,
  getCurrentUserRole,
} from "@/lib/actions/index";

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  features: string | null;
  maxPages: number;
  maxProducts: number;
  maxStorage: number;
  maxBandwidth: number;
  active: boolean;
}

interface Subscription {
  id: number;
  siteId: number;
  status: string;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  plan: {
    name: string;
    price: number;
    currency: string;
    interval: string;
  };
}

interface CurrentSub {
  id: number;
  status: string;
  planId: number;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  plan: {
    id: number;
    name: string;
    slug: string;
    price: number;
    currency: string;
    interval: string;
    features: string | null;
    maxPages: number;
    maxProducts: number;
    maxStorage: number;
    maxBandwidth: number;
  };
}

export default function BillingPage() {
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [subscribingPlan, setSubscribingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    Promise.all([getPlans(), getCurrentSubscription(), getCurrentUserRole()])
      .then(async ([p, c, role]) => {
        const superAdmin = role === "super_admin";
        const s = superAdmin ? await getAllSubscriptions() : [];
        setPlansList(p as Plan[]);
        setSubscriptions(s);
        setCurrentSub((c as CurrentSub) ?? null);
        setIsSuperAdmin(superAdmin);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSubscribe(planSlug: string) {
    setSubscribingPlan(planSlug);
    startTransition(async () => {
      const result = await subscribeToPlan(planSlug);
      setSubscribingPlan(null);
      if (result?.success) {
        if ("url" in result && result.url) {
          window.location.href = result.url;
          return;
        }
        toast.success(result.message ?? "Plan updated.");
        const [plans2, sub2] = await Promise.all([getPlans(), getCurrentSubscription()]);
        const subs2 = isSuperAdmin ? await getAllSubscriptions() : [];
        setPlansList(plans2 as Plan[]);
        setSubscriptions(subs2);
        setCurrentSub((sub2 as CurrentSub) ?? null);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleManageSubscription() {
    setPortalLoading(true);
    startTransition(async () => {
      const result = await manageSubscription();
      setPortalLoading(false);
      if (result?.success && "url" in result && result.url) {
        window.location.href = result.url;
      } else {
        toast.error(result?.message ?? "Failed to open billing portal.");
      }
    });
  }

  function handleCreatePlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await adminCreatePlan({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowAddPlan(false);
        const updated = await getPlans();
        setPlansList(updated as Plan[]);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleDeletePlan(id: number) {
    startTransition(async () => {
      const result = await adminDeletePlan(id);
      if (result?.success) {
        toast.success(result.message);
        setPlansList((prev) => prev.filter((p) => p.id !== id));
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing & Plans</h1>
          <p className="text-sm text-muted-foreground">
            Manage subscription plans and view active subscriptions.
          </p>
        </div>
        {isSuperAdmin && <Dialog open={showAddPlan} onOpenChange={setShowAddPlan}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input name="name" required placeholder="Pro Plan" />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug *</Label>
                  <Input name="slug" required placeholder="pro" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea name="description" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Price (cents) *</Label>
                  <Input name="price" type="number" required min="0" defaultValue="0" />
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input name="currency" defaultValue="usd" />
                </div>
                <div className="space-y-1.5">
                  <Label>Interval</Label>
                  <select name="interval" className="w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Max Pages</Label>
                  <Input name="maxPages" type="number" min="1" defaultValue="10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Products</Label>
                  <Input name="maxProducts" type="number" min="1" defaultValue="50" />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Storage (MB)</Label>
                  <Input name="maxStorage" type="number" min="100" defaultValue="1000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Bandwidth (GB)</Label>
                  <Input name="maxBandwidth" type="number" min="1" defaultValue="10" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Stripe Price ID</Label>
                <Input name="stripePriceId" placeholder="price_xxx" />
              </div>
              <div className="space-y-1.5">
                <Label>Features (JSON array)</Label>
                <Textarea
                  name="features"
                  rows={3}
                  placeholder='["Unlimited pages", "Custom domain", "Priority support"]'
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked className="rounded" />
                Active
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAddPlan(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plansList.map((plan) => {
          const isCurrent = currentSub?.planId === plan.id;
          return (
          <Card key={plan.id} className={isCurrent ? "border-primary/60" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.slug}</p>
                </div>
                <Badge variant={plan.active ? "default" : "secondary"}>
                  {plan.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">
                {plan.price === 0
                  ? "Free"
                  : `${new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: plan.currency.toUpperCase(),
                    }).format(plan.price / 100)}/${plan.interval}`}
              </div>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
              <div className="space-y-1 text-sm">
                <p>Pages: {plan.maxPages}</p>
                <p>Products: {plan.maxProducts}</p>
                <p>Storage: {plan.maxStorage} MB</p>
                <p>Bandwidth: {plan.maxBandwidth} GB</p>
              </div>
              {plan.features && (
                <div className="space-y-1">
                  {(() => {
                    try {
                      const feats = JSON.parse(plan.features) as string[];
                      return feats.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="size-3 text-green-500" />
                          {f}
                        </div>
                      ));
                    } catch {
                      return null;
                    }
                  })()}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  disabled={pending || subscribingPlan === plan.slug || isCurrent}
                  onClick={() => handleSubscribe(plan.slug)}
                >
                  {subscribingPlan === plan.slug ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current plan"
                  ) : currentSub ? (
                    "Upgrade"
                  ) : (
                    "Subscribe"
                  )}
                </Button>
                {isSuperAdmin && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Your subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentSub ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={currentSub.status === "active" ? "default" : "secondary"}>
                  {currentSub.status}
                </Badge>
                <p className="text-sm">
                  <span className="font-medium">{currentSub.plan.name}</span>
                  {currentSub.currentPeriodEnd && (
                    <span className="text-muted-foreground">
                      {" "}· renews{" "}
                      {new Date(currentSub.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
              <Button variant="outline" className="gap-2" disabled={portalLoading} onClick={handleManageSubscription}>
                {portalLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                Manage billing (Stripe portal)
                <ExternalLink className="size-3" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Upgrade, downgrade, cancel, or update your payment method from the Stripe billing portal.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No subscription selected. Choose a plan above to get started.
            </p>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && <div>
        <h2 className="mb-4 text-lg font-semibold">Active Subscriptions</h2>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active subscriptions.</p>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Site</th>
                  <th className="px-4 py-2 text-left font-medium">Plan</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Price</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0">
                    <td className="px-4 py-2">Site #{sub.siteId}</td>
                    <td className="px-4 py-2">{sub.plan.name}</td>
                    <td className="px-4 py-2">
                      <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: sub.plan.currency.toUpperCase(),
                      }).format(sub.plan.price / 100)}
                      /{sub.plan.interval}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}
    </div>
  );
}
