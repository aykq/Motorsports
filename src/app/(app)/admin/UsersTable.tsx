"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Loader2, ShieldBan, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type UserStatus = "pending" | "approved" | "blocked";
type Action = "delete" | "approve" | "block" | "pending";

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  status: string;
  createdAt: string;
  provider: string | null;
}

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: "Bekliyor",
  approved: "Onaylı",
  blocked: "Engelli",
};

const STATUS_CLASS: Record<UserStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  approved: "bg-green-500/10 text-green-500 border-green-500/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
};

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  resend: "E-posta",
};

export function UsersTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<Record<string, Action | null>>({});

  const { data: userList } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    initialData: initialUsers,
    refetchInterval: 5000,
    staleTime: 0,
  });

  async function handleAction(userId: string, action: Action) {
    if (action === "delete") {
      const user = userList?.find((u) => u.id === userId);
      const label = user?.name ?? user?.email ?? "bu kullanıcıyı";
      if (!window.confirm(`${label} silinsin mi? Bu işlem geri alınamaz.`)) return;
    }

    setLoading((prev) => ({ ...prev, [userId]: action }));
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } finally {
      setLoading((prev) => ({ ...prev, [userId]: null }));
    }
  }

  if (!userList || userList.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Henüz kayıtlı kullanıcı yok.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {userList.map((user) => {
        const status = user.status as UserStatus;
        const isLoading = (action: Action) => loading[user.id] === action;
        const anyLoading = loading[user.id] != null;
        const initials = user.name
          ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
          : (user.email?.[0] ?? "?").toUpperCase();

        const createdAt = new Intl.DateTimeFormat("tr-TR", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
          timeZone: "Europe/Istanbul",
        }).format(new Date(user.createdAt));

        return (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                  {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      {user.name && <p className="text-sm font-medium truncate">{user.name}</p>}
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">{createdAt}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {user.provider && (
                        <Badge variant="secondary" className="text-xs">
                          {PROVIDER_LABEL[user.provider] ?? user.provider}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-xs border", STATUS_CLASS[status] ?? "")}
                      >
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {status !== "approved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs border-green-500/50 text-green-500 hover:bg-green-500/10"
                        onClick={() => handleAction(user.id, "approve")}
                        disabled={anyLoading}
                      >
                        {isLoading("approve") ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                        Onayla
                      </Button>
                    )}
                    {status !== "blocked" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
                        onClick={() => handleAction(user.id, "block")}
                        disabled={anyLoading}
                      >
                        {isLoading("block") ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldBan className="h-3 w-3 mr-1" />}
                        Engelle
                      </Button>
                    )}
                    {status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2.5 text-xs border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                        onClick={() => handleAction(user.id, "pending")}
                        disabled={anyLoading}
                      >
                        {isLoading("pending") ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3 mr-1" />}
                        Beklemeye Al
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs border-destructive/50 text-destructive hover:bg-destructive/10 ml-auto"
                      onClick={() => handleAction(user.id, "delete")}
                      disabled={anyLoading}
                    >
                      {isLoading("delete") ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                      Sil
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
