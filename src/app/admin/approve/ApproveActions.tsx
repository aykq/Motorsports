"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { CheckCircle, Loader2, ShieldBan, Trash2 } from "lucide-react";

type Action = "approve" | "reject" | "block";

interface TargetUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  signupAt: string;
  provider: string;
}

const ACTION_LABELS: Record<Action, string> = {
  approve: "Kullanıcı onaylandı.",
  reject: "Kullanıcı kaydı silindi.",
  block: "Kullanıcı engellendi.",
};

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google OAuth",
  resend: "E-posta (Magic Link)",
};

export function ApproveActions({ user, token }: { user: TargetUser; token: string }) {
  const [loading, setLoading] = useState<Action | null>(null);
  const [done, setDone] = useState<Action | null>(null);
  const [error, setError] = useState(false);

  async function handleAction(action: Action) {
    setLoading(action);
    setError(false);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      if (!res.ok) throw new Error();
      setDone(action);
    } catch {
      setError(true);
    } finally {
      setLoading(null);
    }
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : (user.email?.[0] ?? "?").toUpperCase();

  const signupDate = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(user.signupAt));

  const providerLabel = PROVIDER_LABELS[user.provider] ?? user.provider;
  const isLoading = loading !== null;

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <div className="space-y-1">
            <p className="font-semibold text-lg">{ACTION_LABELS[done]}</p>
            {user.name && <p className="text-sm text-muted-foreground">{user.name}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center">
            <span className="text-3xl font-black tracking-tight text-rose-500">MS</span>
            <span className="text-3xl font-black tracking-tight text-foreground">Hub</span>
          </div>
          <p className="text-sm text-muted-foreground">Kullanıcı Onay Paneli</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 shrink-0">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                <AvatarFallback className="text-base">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-1 min-w-0">
                {user.name && <p className="font-semibold truncate">{user.name}</p>}
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <Badge variant="secondary" className="text-xs">{providerLabel}</Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <p className="text-xs text-muted-foreground">Kayıt: {signupDate}</p>
          </CardContent>

          <CardFooter className="flex-col gap-2">
            {error && (
              <p className="text-sm text-destructive text-center w-full mb-1">
                Bir hata oluştu. Tekrar dene.
              </p>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleAction("approve")}
              disabled={isLoading}
            >
              {loading === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Onayla
            </Button>
            <Button
              variant="outline"
              className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10"
              onClick={() => handleAction("reject")}
              disabled={isLoading}
            >
              {loading === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Reddet (kaydı sil)
            </Button>
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => handleAction("block")}
              disabled={isLoading}
            >
              {loading === "block" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldBan className="h-4 w-4 mr-2" />
              )}
              Engelle
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
