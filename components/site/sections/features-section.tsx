import { Coffee, Heart, Leaf, SquareParking, Sun, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Feature } from "@/lib/settings";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { leaf: Leaf, sun: Sun, users: Users, parking: SquareParking, coffee: Coffee, heart: Heart, star: Leaf, home: Leaf };

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = ICONS[feature.icon] ?? Leaf;
  return (
    <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex h-full flex-col items-start gap-3 p-6">
        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span>
        <h3 className="font-heading text-lg font-semibold">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
      </CardContent>
    </Card>
  );
}

export function FeaturesSection({ features }: { features: Feature[] }) {
  if (features.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">Why Maiti Resort</p>
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">A getaway that has it all</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => <FeatureCard key={f.title} feature={f} />)}
      </div>
    </section>
  );
}
