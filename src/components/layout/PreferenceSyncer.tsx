"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

interface Props {
  dbLanguage: string | null;
  dbTheme: string | null;
}

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
const VALID_LOCALES = ["tr", "en"];
const VALID_THEMES = ["light", "dark", "system"];

export function PreferenceSyncer({ dbLanguage, dbTheme }: Props) {
  const { setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    let needsRefresh = false;

    if (dbLanguage && VALID_LOCALES.includes(dbLanguage)) {
      const current = document.cookie
        .split("; ")
        .find((c) => c.startsWith("NEXT_LOCALE="))
        ?.split("=")[1];

      if (current !== dbLanguage) {
        document.cookie = `NEXT_LOCALE=${dbLanguage}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        needsRefresh = true;
      }
    }

    if (dbTheme && VALID_THEMES.includes(dbTheme)) {
      setTheme(dbTheme);
    }

    if (needsRefresh) {
      router.refresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
