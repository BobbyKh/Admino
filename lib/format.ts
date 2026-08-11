export function formatBookingDate(date: string, time: string) {
  try {
    const d = new Date(`${date}T${time || "12:00"}`);
    return d.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return `${date} at ${time}`;
  }
}

export function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(price / 100);
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function withPreviewSite(path: string, siteSlug?: string | null) {
  if (!siteSlug) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}site=${encodeURIComponent(siteSlug)}`;
}
