"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

export function MagicLinkForm() {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const { data: statusData } = useQuery({
    queryKey: ["auth-status", email],
    queryFn: async () => {
      const res = await fetch(`/api/auth-status?email=${encodeURIComponent(email)}`);
      return res.json() as Promise<{ status: string; autoLoginToken?: string }>;
    },
    enabled: sent && !!email,
    refetchInterval: 5000,
    retry: false,
  });

  useEffect(() => {
    if (!statusData?.autoLoginToken) return;
    router.push(`/api/auth/auto-login?token=${encodeURIComponent(statusData.autoLoginToken)}`);
  }, [statusData, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(false);
    try {
      const result = await signIn("resend", { email, redirect: false, callbackUrl: "/" });
      if (result?.error) {
        setError(true);
      } else {
        fetch("/api/notify-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }).catch(() => {});
        setSent(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="rounded-full bg-green-500/10 p-3">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
        </div>
        <div className="text-center space-y-0.5">
          <p className="text-sm font-medium">{t("linkSent")}</p>
          <p className="text-xs text-muted-foreground">{email}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="email"
        placeholder={t("emailPlaceholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        disabled={loading}
      />
      {error && <p className="text-xs text-destructive text-center">{t("error")}</p>}
      <Button type="submit" className="w-full" disabled={loading || !email}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("magicLink")}
      </Button>
    </form>
  );
}
