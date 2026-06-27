"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { syncNewsAction } from "@/app/(app)/admin/actions";

type SyncState = "idle" | "pending" | "success";

export function NewsSyncButton() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<SyncState>("idle");

  function handleSync() {
    setState("pending");
    startTransition(async () => {
      await syncNewsAction();
      router.refresh();
      setState("success");
      setTimeout(() => setState("idle"), 3000);
    });
  }

  return (
    <button
      onClick={handleSync}
      disabled={state !== "idle"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 disabled:cursor-not-allowed",
        state === "idle" && "bg-background border border-border hover:bg-accent/50 text-muted-foreground hover:text-foreground",
        state === "pending" && "bg-background border border-border text-muted-foreground opacity-60",
        state === "success" && "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
      )}
    >
      {state === "idle" && <RefreshCw className="w-3 h-3" />}
      {state === "pending" && <Loader2 className="w-3 h-3 animate-spin" />}
      {state === "success" && (
        <Check className="w-3 h-3 animate-in zoom-in-50 duration-200" />
      )}
      <span>
        {state === "success" ? "Güncellendi" : state === "pending" ? "Güncelleniyor..." : "Güncelle"}
      </span>
    </button>
  );
}
