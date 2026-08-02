import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

const VARIANTS = {
  info: { icon: Info, bg: "bg-blue-50 border-blue-200", text: "text-blue-800" },
  success: { icon: CheckCircle, bg: "bg-green-50 border-green-200", text: "text-green-800" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50 border-amber-200", text: "text-amber-800" },
  error: { icon: AlertCircle, bg: "bg-red-50 border-red-200", text: "text-red-800" },
};

export function AlertBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const variant = (c.variant as keyof typeof VARIANTS) || "info";
  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className={cn("flex items-start gap-3 rounded-lg border p-4", v.bg, v.text)}>
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          {c.title && <p className="font-medium">{c.title}</p>}
          <p className="text-sm">{c.text || "Configure this alert block."}</p>
        </div>
      </div>
    </section>
  );
}
