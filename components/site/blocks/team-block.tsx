import Image from "next/image";
import { Mail, Link, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

interface TeamMember {
  name: string;
  role?: string;
  image?: string;
  bio?: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
}

function parseMembers(raw: string | null): TeamMember[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function TeamBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const members = parseMembers(c.items);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        {c.badge && <p className="mb-2 text-sm font-medium tracking-widest text-primary uppercase">{c.badge}</p>}
        <h2 className="font-heading text-3xl font-semibold sm:text-4xl">
          {c.title || "Meet the Team"}
        </h2>
        {c.subtitle && (
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{c.subtitle}</p>
        )}
      </div>
      {members.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, i) => (
            <Card key={i} className="h-full text-center transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex flex-col items-center gap-3 p-6">
                {m.image ? (
                  <div className="relative size-24 overflow-hidden rounded-full">
                    <Image src={m.image} alt={m.name} fill className="object-cover" sizes="96px" />
                  </div>
                ) : (
                  <Avatar className="size-24">
                    <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                      {m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <h3 className="font-heading font-semibold">{m.name}</h3>
                  {m.role && <p className="text-sm text-primary">{m.role}</p>}
                </div>
                {m.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{m.bio}</p>
                )}
                <div className="flex gap-2">
                  {m.email && (
                    <a href={`mailto:${m.email}`} className="text-muted-foreground hover:text-foreground">
                      <Mail className="size-4" />
                    </a>
                  )}
                  {m.linkedin && (
                    <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <Link className="size-4" />
                    </a>
                  )}
                  {m.twitter && (
                    <a href={m.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                      <Globe className="size-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No team members configured. Add items as JSON in the block config.
        </p>
      )}
    </section>
  );
}
