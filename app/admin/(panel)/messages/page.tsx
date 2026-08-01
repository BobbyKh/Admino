import { desc } from "drizzle-orm";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteMessage, toggleMessageRead } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const rows = await db
    .select()
    .from(messages)
    .orderBy(desc(messages.createdAt))
    .all();
  const unread = rows.filter((m) => !m.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages from the contact form ({unread} unread).
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-3">
          <Mail className="size-4 text-primary" />
          <CardTitle className="font-heading">Inbox ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl border p-5 ${
                    m.read ? "bg-background" : "border-primary/30 bg-primary/5"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{m.subject}</h3>
                        {!m.read && <Badge>New</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        From {m.name} · {m.email}
                        {m.phone ? ` · ${m.phone}` : ""} ·{" "}
                        {new Date(m.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form
                        action={toggleMessageRead.bind(null, m.id, !m.read)}
                      >
                        <Button type="submit" variant="outline" size="sm">
                          {m.read ? "Mark unread" : "Mark read"}
                        </Button>
                      </form>
                      <form action={deleteMessage.bind(null, m.id)}>
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {m.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
