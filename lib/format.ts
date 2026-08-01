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
