const THEME_TOKENS = {
  themePrimary: ["--primary", "--sidebar-primary", "--chart-1", "--ring", "--sidebar-ring"],
  themePrimaryForeground: ["--primary-foreground", "--sidebar-primary-foreground"],
  themeSecondary: ["--secondary", "--sidebar-accent", "--chart-2"],
  themeSecondaryForeground: ["--secondary-foreground", "--sidebar-accent-foreground"],
  themeAccent: ["--accent", "--chart-3"],
  themeAccentForeground: ["--accent-foreground"],
  themeBackground: ["--background", "--sidebar"],
  themeForeground: ["--foreground", "--sidebar-foreground"],
  themeMuted: ["--muted"],
  themeMutedForeground: ["--muted-foreground"],
  themeBorder: ["--border", "--input", "--sidebar-border"],
  themeRing: ["--ring", "--sidebar-ring"],
  themeDestructive: ["--destructive"],
  themeCard: ["--card", "--popover"],
  themeCardForeground: ["--card-foreground", "--popover-foreground"],
} as const;

const THEME_FALLBACKS: Record<keyof typeof THEME_TOKENS, string> = {
  themePrimary: "oklch(0.5 0.11 155)",
  themePrimaryForeground: "oklch(0.985 0 0)",
  themeSecondary: "oklch(0.945 0.02 140)",
  themeSecondaryForeground: "oklch(0.3 0.05 150)",
  themeAccent: "oklch(0.93 0.03 90)",
  themeAccentForeground: "oklch(0.3 0.06 90)",
  themeBackground: "oklch(0.985 0.005 120)",
  themeForeground: "oklch(0.16 0.02 145)",
  themeMuted: "oklch(0.955 0.01 140)",
  themeMutedForeground: "oklch(0.5 0.02 145)",
  themeBorder: "oklch(0.9 0.015 140)",
  themeRing: "oklch(0.5 0.11 155)",
  themeDestructive: "oklch(0.577 0.245 27.325)",
  themeCard: "oklch(1 0 0)",
  themeCardForeground: "oklch(0.16 0.02 145)",
};

type ThemeColorSettings = Partial<Record<keyof typeof THEME_TOKENS, string>>;

export function buildThemeCss(settings: ThemeColorSettings) {
  const declarations = Object.entries(THEME_TOKENS).flatMap(([key, variables]) => {
    const token = key as keyof typeof THEME_TOKENS;
    const value = sanitizeCssColor(settings[token], THEME_FALLBACKS[token]);
    return variables.map((variable) => `  ${variable}: ${value};`);
  });

  return `:root {\n${declarations.join("\n")}\n}`;
}

export function sanitizeCssColor(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 80) return fallback;
  if (!/^[#a-zA-Z0-9\s.,%()+/-]+$/.test(trimmed)) return fallback;
  if (/url|expression|import|javascript/i.test(trimmed)) return fallback;
  return trimmed;
}
