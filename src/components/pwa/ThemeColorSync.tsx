"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

// Must match --background in globals.css and themeColor in app/layout.tsx.
const THEME_COLORS = { dark: "#0b0f14", light: "#f5f7f9" } as const;

export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "dark" && resolvedTheme !== "light") return;
    const color = THEME_COLORS[resolvedTheme];
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", color));
  }, [resolvedTheme]);

  return null;
}
