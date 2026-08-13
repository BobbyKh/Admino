"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Trash2, RotateCw, Check, X, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getWebhooks,
  createWebhook,
  deleteWebhook,
  toggleWebhook,
  getWebhookDeliveries,
  retryWebhookDelivery,
  getWebhookEvents,
} from "@/lib/actions/webhooks";
import { useAdminSiteId } from "@/components/admin/admin-site-context";
import { BulkRowCheckbox, BulkSelectAll, BulkSelectionScope } from "@/components/admin/bulk-selection-scope";

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string;
  active: boolean;
  createdAt: string;
}

interface Delivery {
  id: number;
  event: string;
  status: string;
  statusCode: number | null;
  response: string | null;
  attempts: number;
  createdAt: string;
}

interface WebhookEventOption {
  event: string;
  description: string;
}

export default function WebhooksPage() {
  const siteId = useAdminSiteId();
  const [webhooksList, setWebhooksList] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<WebhookEventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedHook, setSelectedHook] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([getWebhooks(), getWebhookEvents()])
      .then(([w, e]) => {
        setWebhooksList(w as Webhook[]);
        setEvents(e);
      })
      .finally(() => setLoading(false));
  }, []);

  function loadDeliveries(hookId: number) {
    setSelectedHook(hookId);
    getWebhookDeliveries(hookId).then((d) => setDeliveries(d as Delivery[]));
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("events", JSON.stringify(selectedEvents));
    startTransition(async () => {
      const result = await createWebhook({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowAdd(false);
        setSelectedEvents([]);
        const updated = await getWebhooks();
        setWebhooksList(updated as Webhook[]);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteWebhook(id);
      if (result?.success) {
        toast.success(result.message);
        setWebhooksList((prev) => prev.filter((w) => w.id !== id));
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleToggle(id: number, active: boolean) {
    startTransition(async () => {
      const result = await toggleWebhook(id, active);
      if (result?.success) {
        setWebhooksList((prev) =>
          prev.map((w) => (w.id === id ? { ...w, active } : w))
        );
      }
    });
  }

  function handleRetry(deliveryId: number) {
    startTransition(async () => {
      const result = await retryWebhookDelivery(deliveryId);
      if (result?.success) {
        toast.success(result.message);
        if (selectedHook) loadDeliveries(selectedHook);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
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
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Send real-time event notifications to external services.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input name="name" required placeholder="Order notifications" />
              </div>
              <div className="space-y-1.5">
                <Label>URL *</Label>
                <Input name="url" required type="url" placeholder="https://your-service.com/webhook" />
              </div>
              <div className="space-y-1.5">
                <Label>Secret (for signature verification)</Label>
                <Input name="secret" placeholder="Optional HMAC secret" />
              </div>
              <div className="space-y-2">
                <Label>Events *</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-3">
                  {events.map((evt) => (
                    <label
                      key={evt.event}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.event)}
                        onChange={() => toggleEvent(evt.event)}
                        className="rounded"
                      />
                      <div>
                        <p className="font-medium">{evt.event}</p>
                        <p className="text-xs text-muted-foreground">{evt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedEvents(
                      selectedEvents.length === events.length ? [] : events.map((e) => e.event)
                    )
                  }
                >
                  {selectedEvents.length === events.length ? "Deselect all" : "Select all"}
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending || selectedEvents.length === 0}>
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <BulkSelectionScope siteId={siteId} entity="webhooks" ids={webhooksList.map((item) => item.id)} options={[{ value: "enable", label: "Enable" }, { value: "disable", label: "Disable" }]}><div className="space-y-3">
          {webhooksList.length > 0 && <div className="flex items-center gap-2 rounded-lg border p-3"><BulkSelectAll /><span className="text-sm text-muted-foreground">Select all webhooks</span></div>}
          {webhooksList.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Bell className="mb-4 size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
              </CardContent>
            </Card>
          ) : (
            webhooksList.map((hook) => (
              <Card key={hook.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <BulkRowCheckbox id={hook.id} label={`Select ${hook.name}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{hook.name}</p>
                      <Badge variant={hook.active ? "default" : "secondary"}>
                        {hook.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{hook.url}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(() => {
                        try {
                          const hookEvents = JSON.parse(hook.events) as string[];
                          return hookEvents.map((e) => (
                            <Badge key={e} variant="outline" className="text-xs">
                              {e}
                            </Badge>
                          ));
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                  <Switch
                    checked={hook.active}
                    onCheckedChange={(val) => handleToggle(hook.id, val)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadDeliveries(hook.id)}
                  >
                    Logs
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => handleDelete(hook.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div></BulkSelectionScope>

        <div>
          {selectedHook ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Recent Deliveries</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadDeliveries(selectedHook)}
                  >
                    <RotateCw className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {deliveries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deliveries yet.</p>
                ) : (
                  deliveries.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-lg border p-2 text-sm"
                    >
                      {d.status === "success" ? (
                        <Check className="size-4 text-green-500" />
                      ) : d.status === "failed" ? (
                        <X className="size-4 text-red-500" />
                      ) : (
                        <RotateCw className="size-4 text-yellow-500 animate-spin" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{d.event}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.statusCode && `${d.statusCode} · `}{d.attempts} attempt{d.attempts !== 1 && "s"} ·{" "}
                          {new Date(d.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {d.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => handleRetry(d.id)}
                        >
                          <RotateCw className="size-3" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <p className="text-sm text-muted-foreground">
                  Select a webhook to view delivery logs.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
