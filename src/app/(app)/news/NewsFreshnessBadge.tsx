"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getNewNewsCountAction } from "./actions";

const POLL_INTERVAL_MS = 60_000;

// Cheap count-only poll (no data fetch) so freshly-scraped news don't force
// a silent page refresh on the reader. Shows a badge instead; clicking it
// runs router.refresh() and NewsListSection's own diff animates the new
// rows in (see NewsListSection.tsx's prevNews/newIndexMap logic).
// Caller must render with `key={sinceIso}` so a refresh remounts this with
// newCount reset to 0 instead of needing to reset state from an effect.
export function NewsFreshnessBadge({ sinceIso }: { sinceIso: string }) {
  const t = useTranslations("newsPage");
  const router = useRouter();
  const [newCount, setNewCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getNewNewsCountAction(sinceIso).then(setNewCount); // check immediately, don't wait a full poll
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      getNewNewsCountAction(sinceIso).then(setNewCount);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sinceIso]);

  if (newCount === 0) return null;

  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors disabled:opacity-60 animate-in fade-in-0 slide-in-from-top-2 duration-300"
    >
      {t("newArticles", { count: newCount })}
    </button>
  );
}
