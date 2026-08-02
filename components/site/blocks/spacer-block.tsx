function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function SpacerBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const height = c.height || "4rem";

  return <div style={{ height }} />;
}
