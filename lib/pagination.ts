/**
 * Server-side pagination helper.
 * Use in server components to get paginated results from Drizzle queries.
 */

export const DEFAULT_PAGE_SIZE = 20;

export function getPaginationParams(searchParams: { get?: (name: string) => string | null; [key: string]: unknown } | Record<string, string | undefined>) {
  const get = "get" in searchParams && typeof searchParams.get === "function"
    ? searchParams.get.bind(searchParams)
    : (name: string) => (searchParams as Record<string, string | undefined>)[name] ?? null;
  const page = Math.max(1, Number(get("page") ?? "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(get("pageSize") ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

export function paginationMeta(total: number, page: number, pageSize: number) {
  return {
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    hasNext: page * pageSize < total,
    hasPrev: page > 1,
  };
}
