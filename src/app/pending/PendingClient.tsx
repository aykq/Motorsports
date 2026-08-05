"use client";

import { useEffect, useRef } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PendingClientProps {
  hasSession: boolean;
  userId: string;
  userName: string | null;
  userEmail: string | null;
}

function clearPendingCookie() {
  document.cookie = "mshub-pending=; max-age=0; path=/";
}

export function PendingClient({ hasSession, userId, userName, userEmail }: PendingClientProps) {
  const t = useTranslations("pending");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { update } = useSession();
  // update() re-renders SessionProvider (loading state toggles), which changes
  // this function's identity — a ref avoids that identity change re-triggering
  // the effect below mid-flight (it would tear down the interval/SSE before
  // update() and the redirect that follows it ever complete).
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  });

  useEffect(() => {
    async function handleApproved() {
      if (hasSession) {
        // update() with no argument does a plain GET (next-auth only sends
        // the update POST — and only then does auth.ts's jwt callback refetch
        // status from the DB — when called with a defined argument), so this
        // must pass something to actually trigger the refresh.
        await updateRef.current({});
        window.location.href = "/";
      } else {
        const result = await signIn("pending-approval", { userId, redirect: false });
        if (result && !result.error) {
          clearPendingCookie();
          window.location.href = "/";
        }
      }
    }

    function handleBlocked() {
      if (hasSession) {
        signOut({ callbackUrl: "/blocked" });
      } else {
        clearPendingCookie();
        window.location.href = "/login?error=AccessDenied";
      }
    }

    // SSE stream
    const es = new EventSource("/api/me/approval-stream");
    es.onmessage = async (event) => {
      const data = JSON.parse(event.data as string) as { status: string };
      if (data.status === "approved") {
        es.close();
        if (intervalRef.current) clearInterval(intervalRef.current);
        await handleApproved();
      }
      if (data.status === "blocked") {
        es.close();
        if (intervalRef.current) clearInterval(intervalRef.current);
        handleBlocked();
      }
    };

    // Fallback polling (5 saniye)
    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/me/status");
        const data = await res.json() as { status: string };
        if (data.status === "approved") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          es.close();
          await handleApproved();
        }
        if (data.status === "blocked") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          es.close();
          handleBlocked();
        }
      } catch {
        // network error — retry on next interval
      }
    }, 5000);

    return () => {
      es.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasSession, userId]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="flex justify-center">
            <span className="font-display text-4xl font-bold tracking-tight text-brand">MS</span>
            <span className="font-display text-4xl font-bold tracking-tight text-foreground">Hub</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("description")}</p>
          </div>

          {(userName || userEmail) && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-0.5">
              {userName && <p className="font-medium">{userName}</p>}
              {userEmail && <p className="text-muted-foreground">{userEmail}</p>}
            </div>
          )}

          <p className="text-xs text-muted-foreground">{t("emailNote")}</p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            clearPendingCookie();
            signOut({ callbackUrl: "/login" });
          }}
        >
          {t("signOut")}
        </Button>
      </div>
    </main>
  );
}
