import { requireAdmin } from "@/lib/auth";
import { getAdminSiteId } from "@/lib/admin-site";
import { getActivityLogs, getActivityLogsCount, type GetActivityLogsOptions } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ActivityLogFilters } from "@/components/admin/activity-log-filters";

export const dynamic = "force-dynamic";

const ACTION_STYLES: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  delete: "bg-destructive/10 text-destructive",
  status_change: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  login: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  logout: "bg-muted text-muted-foreground",
};

const ENTITY_LABELS: Record<string, string> = {
  settings: "Settings",
  gallery: "Gallery",
  menu_category: "Menu Category",
  menu_item: "Menu Item",
  booking: "Booking",
  message: "Message",
  page: "Page",
  page_block: "Page Block",
  site: "Site",
  user: "User",
  media: "Media",
  navigation: "Navigation",
  home_section: "Home Section",
};

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const siteId = await getAdminSiteId();
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;
  const action = typeof params.action === "string" ? params.action : undefined;
  const entity = typeof params.entity === "string" ? params.entity : undefined;

  const [logs, total] = await Promise.all([
    getActivityLogs({
      siteId,
      action: action as GetActivityLogsOptions["action"],
      entity: entity as GetActivityLogsOptions["entity"],
      limit,
      offset,
    }),
    getActivityLogsCount({ siteId, action: action as GetActivityLogsOptions["action"], entity: entity as GetActivityLogsOptions["entity"] }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground">
          Track all admin activities across your platform
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <ActivityLogFilters currentAction={action} currentEntity={entity} />
          </div>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No activity recorded yet.
            </p>
          ) : (
            <>
              <Table className="min-w-[720px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-44">User</TableHead>
                    <TableHead className="w-44">Entity</TableHead>
                    <TableHead className="w-52">Details</TableHead>
                    <TableHead className="w-36 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={ACTION_STYLES[log.action] ?? ""}
                        >
                          {log.action.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{log.userName}</p>
                          <p className="text-xs text-muted-foreground">{log.userRole}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{ENTITY_LABELS[log.entity] ?? log.entity}</p>
                          {log.entityName && (
                            <p className="truncate text-xs text-muted-foreground">{log.entityName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.details ? (
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {log.details}
                          </p>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <a
                        href={`/admin/activity?page=${page - 1}${action ? `&action=${action}` : ""}${entity ? `&entity=${entity}` : ""}`}
                        className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80"
                      >
                        Previous
                      </a>
                    )}
                    {page < totalPages && (
                      <a
                        href={`/admin/activity?page=${page + 1}${action ? `&action=${action}` : ""}${entity ? `&entity=${entity}` : ""}`}
                        className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium hover:bg-muted/80"
                      >
                        Next
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
