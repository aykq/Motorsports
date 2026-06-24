"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";

interface BlockedClientProps {
  userEmail: string | null;
  userName: string | null;
}

export function BlockedClient({ userEmail, userName }: BlockedClientProps) {
  const router = useRouter();
  const t = useTranslations("blocked");
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    const es = new EventSource("/api/me/approval-stream");
    es.onmessage = (event) => {
      const data = JSON.parse(event.data as string) as { status: string };
      if (data.status === "approved") {
        es.close();
        clearInterval(intervalRef.current);
        router.push("/");
      }
      if (data.status === "deleted") {
        es.close();
        clearInterval(intervalRef.current);
        window.location.href = "/force-signout";
      }
    };
    es.onerror = () => es.close();

    async function checkStatus() {
      try {
        const res = await fetch("/api/me/status");
        const data = await res.json() as { status: string };
        if (data.status === "approved") {
          clearInterval(intervalRef.current);
          router.push("/");
        }
        if (data.status === "unknown") {
          clearInterval(intervalRef.current);
          window.location.href = "/force-signout";
        }
      } catch {
        // ignore
      }
    }
    intervalRef.current = setInterval(checkStatus, 5000);

    return () => {
      es.close();
      clearInterval(intervalRef.current);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="flex justify-center">
          <span className="font-display text-4xl font-bold uppercase tracking-tight text-brand">MS</span>
          <span className="font-display text-4xl font-bold uppercase tracking-tight text-foreground">Hub</span>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            <p className="text-xs text-muted-foreground/60">{t("waitingUnblock")}</p>
          </div>

          {(userName || userEmail) && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-0.5">
              {userName && <p className="font-medium">{userName}</p>}
              {userEmail && <p className="text-muted-foreground">{userEmail}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
