"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface PendingClientProps {
  userName: string | null;
  userEmail: string | null;
}

export function PendingClient({ userName, userEmail }: PendingClientProps) {
  const router = useRouter();
  const t = useTranslations("pending");

  const { data } = useQuery({
    queryKey: ["me-status"],
    queryFn: async () => {
      const res = await fetch("/api/me/status");
      return res.json() as Promise<{ status: string }>;
    },
    refetchInterval: 5000,
    retry: false,
  });

  useEffect(() => {
    if (data?.status === "approved") router.push("/");
    if (data?.status === "blocked") signOut({ callbackUrl: "/login?error=AccessDenied" });
  }, [data, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <div className="flex justify-center">
            <span className="text-4xl font-black tracking-tight text-rose-500">MS</span>
            <span className="text-4xl font-black tracking-tight text-foreground">Hub</span>
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
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          {t("signOut")}
        </Button>
      </div>
    </div>
  );
}
