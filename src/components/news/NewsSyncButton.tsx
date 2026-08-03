"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { syncNewsAction } from "@/app/(app)/admin/actions";

type SyncState = "idle" | "pending" | "success";

interface Props {
  size?: "sm" | "md";
  onResult?: (result: { ok: boolean; message: string }) => void;
}

export function NewsSyncButton({ size = "sm", onResult }: Props) {
  const t = useTranslations("newsSync");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<SyncState>("idle");

  function handleSync() {
    setState("pending");
    startTransition(async () => {
      const result = await syncNewsAction();
      onResult?.(result);
      router.refresh();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
    });
  }

  const iconClass = size === "md" ? "w-4 h-4" : "w-3 h-3";

  return (
    <button
      onClick={handleSync}
      disabled={state !== "idle"}
      className={cn(
        "flex items-center rounded-lg border font-medium transition-all duration-300 disabled:cursor-not-allowed",
        size === "md" ? "gap-2 px-4 py-2 text-sm" : "gap-1.5 px-3 py-1.5 text-xs",
        state === "idle" && "bg-background border-border hover:bg-accent/50 text-muted-foreground hover:text-foreground",
        state === "pending" && "bg-background border-border text-muted-foreground opacity-60",
        state === "success" && "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      )}
    >
      {state === "idle" && <RefreshCw className={iconClass} />}
      {state === "pending" && <Loader2 className={cn(iconClass, "animate-spin")} />}
      {state === "success" && <Check className={cn(iconClass, "animate-in zoom-in-50 duration-200")} />}
      <span>{t(state)}</span>
    </button>
  );
}
