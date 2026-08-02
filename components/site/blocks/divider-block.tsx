function parseConfig(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function DividerBlock({ config }: { config: string | null }) {
  const c = parseConfig(config);
  const style = c.style || "solid";
  const width = c.width || "100%";
  const color = c.color || "var(--border)";

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      <hr
        style={{
          width,
          borderStyle: style,
          borderWidth: "1px 0 0 0",
          borderColor: color,
          margin: "0 auto",
        }}
      />
    </div>
  );
}
