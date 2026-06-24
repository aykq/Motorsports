"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Series slug → CSS color variable. Drives the app-wide --series accent so the
// sidebar, headers and active states tint to the series you're viewing.
const SERIES_VAR: Record<string, string> = {
  f1: "var(--f1)",
  wec: "var(--wec)",
  motogp: "var(--motogp)",
  moto2: "var(--moto2)",
  moto3: "var(--moto3)",
  gt3: "var(--gt3)",
  gt4: "var(--gt4)",
  "carrera-cup": "var(--carrera-cup)",
};

export function SeriesAccent() {
  const pathname = usePathname();

  useEffect(() => {
    const seg = pathname.split("/")[1] ?? "";
    const accent = SERIES_VAR[seg] ?? "var(--brand)";
    document.documentElement.style.setProperty("--series", accent);
    return () => {
      document.documentElement.style.setProperty("--series", "var(--brand)");
    };
  }, [pathname]);

  return null;
}
