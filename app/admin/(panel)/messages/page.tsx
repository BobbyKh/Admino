import { and, desc, count, eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteMessage, toggleMessageRead } from "@/lib/actions";
import { Pagination } from "@/components/admin/pagination";
import { getPaginationParams, paginationMeta } from "@/lib/pagination";
import { getAdminSiteId } from "@/lib/admin-site";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const { page, pageSize, offset } = getPaginationParams(params);
  const siteId = await getAdminSiteId();

  const siteFilter = eq(messages.siteId, siteId);
  const [totalResult] = await db.select({ value: count() }).from(messages).where(siteFilter);
  const total = totalResult.value;
  const meta = paginationMeta(total, page, pageSize);

  const rows = await db
    .select()
    .from(messages)
    .where(siteFilter)
    .orderBy(desc(messages.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [unreadResult] = await db
    .select({ value: count() })
    .from(messages)
    .where(and(siteFilter, eq(messages.read, false)));
  const unread = unreadResult.value;

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
          <CardTitle className="font-heading">Inbox ({total})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No messages yet.
            </p>
          ) : (
            <>
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
              <Pagination {...meta} pageSize={pageSize} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
