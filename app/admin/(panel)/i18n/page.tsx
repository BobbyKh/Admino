"use client";

import { useState, useEffect, useTransition } from "react";
import { Plus, Trash2, Star, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  getLocales,
  addLocale,
  deleteLocale,
  setDefaultLocale,
} from "@/lib/actions/index";

interface Locale {
  id: number;
  code: string;
  name: string;
  isDefault: boolean;
  active: boolean;
}

const COMMON_LOCALES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "ne", name: "Nepali" },
];

export default function I18nPage() {
  const [locales, setLocales] = useState<Locale[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    getLocales().then((l) => {
      setLocales(l as Locale[]);
      setLoading(false);
    });
  }, []);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addLocale({}, formData);
      if (result?.success) {
        toast.success(result.message);
        setShowAdd(false);
        const updated = await getLocales();
        setLocales(updated as Locale[]);
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteLocale(id);
      if (result?.success) {
        toast.success(result.message);
        setLocales((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error(result?.message ?? "Failed");
      }
    });
  }

  function handleSetDefault(id: number) {
    startTransition(async () => {
      const result = await setDefaultLocale(id);
      if (result?.success) {
        setLocales((prev) =>
          prev.map((l) => ({ ...l, isDefault: l.id === id }))
        );
        toast.success("Default locale updated.");
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
          <h1 className="text-2xl font-bold tracking-tight">Languages (i18n)</h1>
          <p className="text-sm text-muted-foreground">
            Manage languages for your site. Add locales to enable multi-language content.
          </p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Add Locale
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Locale</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Language Code *</Label>
                <Input name="code" required placeholder="e.g. fr, es, de" />
                <p className="text-xs text-muted-foreground">
                  ISO 639-1 code (2-3 letters)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input name="name" required placeholder="e.g. French, Spanish" />
              </div>
              <div className="space-y-2">
                <Label>Quick add common languages:</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_LOCALES.map((locale) => (
                    <Button
                      key={locale.code}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const form = document.querySelector("form");
                        if (form) {
                          const codeInput = form.querySelector<HTMLInputElement>("[name=code]");
                          const nameInput = form.querySelector<HTMLInputElement>("[name=name]");
                          if (codeInput) codeInput.value = locale.code;
                          if (nameInput) nameInput.value = locale.name;
                        }
                      }}
                    >
                      {locale.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowAdd(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Add
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {locales.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Globe className="mb-4 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No locales configured. Add your first language to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {locales.map((locale) => (
            <Card key={locale.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold uppercase">
                  {locale.code}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{locale.name}</p>
                    {locale.isDefault && (
                      <Badge variant="default" className="text-xs">
                        <Star className="mr-1 size-3" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{locale.code}</p>
                </div>
                <div className="flex gap-1">
                  {!locale.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => handleSetDefault(locale.id)}
                      title="Set as default"
                    >
                      <Star className="size-4" />
                    </Button>
                  )}
                  {!locale.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => handleDelete(locale.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4">
        <h3 className="mb-2 font-medium">How translations work</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Add locales above to enable multi-language content</li>
          <li>• The default locale uses original page content</li>
          <li>• Translations are stored per-page and per-block</li>
          <li>• Visitors are auto-detected via Accept-Language header</li>
          <li>• Users can switch languages via the locale switcher in the navbar</li>
          <li>• Use the AI Translation feature to auto-translate page content</li>
        </ul>
      </div>
    </div>
  );
}
