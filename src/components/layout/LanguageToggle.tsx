"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function LanguageToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale() {
    const next = locale === "tr" ? "en" : "tr";
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: next }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className={cn(
        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50",
        className
      )}
      aria-label="Switch language"
    >
      <span className={cn(locale === "tr" ? "text-foreground" : "text-muted-foreground/50")}>TR</span>
      <span className="text-muted-foreground/30">/</span>
      <span className={cn(locale === "en" ? "text-foreground" : "text-muted-foreground/50")}>EN</span>
    </button>
  );
}
