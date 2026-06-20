"use client";

import { useTransition, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  RefreshCw, Trash2, Bell, Settings, CheckCircle, XCircle,
  Loader2, Users, ShieldCheck,
} from "lucide-react";
import { syncSeriesAction, clearRaceDetailAction, sendTestNotifAction, syncNewsAction } from "./actions";
import { UsersTable } from "./UsersTable";

const ALL_SERIES = ["f1", "wec", "motogp", "moto2", "moto3", "gt3", "gt4", "carrera-cup"] as const;

const SERIES_COLOR: Record<string, string> = {
  f1: "#e11d48", wec: "#0ea5e9", motogp: "#f97316", moto2: "#fb923c",
  moto3: "#fbbf24", gt3: "#22c55e", gt4: "#eab308", "carrera-cup": "#a855f7",
};

function syncDotColor(lastSync: string | null): string {
  if (!lastSync) return "#ef4444";
  const diff = Date.now() - new Date(lastSync).getTime();
  if (diff < 60 * 60 * 1000) return "#22c55e";
  if (diff < 24 * 60 * 60 * 1000) return "#f59e0b";
  return "#ef4444";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}d`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s`;
  return `${Math.floor(h / 24)}g`;
}

interface Toast { id: number; ok: boolean; message: string; }
let toastId = 0;

interface AdminUser {
  id: string; name: string | null; email: string | null;
  image: string | null; status: string; createdAt: string; provider: string | null;
}

interface Stats {
  totalUsers: number; pendingUsers: number;
  activeSubscriptions: number; activeSessions: number;
  subscriptionsBySeries: Record<string, number>;
}

interface Props {
  stats: Stats;
  lastSyncTimes: Record<string, string | null>;
  initialUsers: AdminUser[];
}

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div
      className="rounded-xl bg-card border border-border px-4 py-3 flex flex-col gap-1"
      style={{ borderLeftColor: accent, borderLeftWidth: "3px" }}
    >
      <span className="text-2xl font-mono font-bold tabular-nums leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none mt-0.5">{label}</span>
    </div>
  );
}

export function AdminPanel({ stats, lastSyncTimes, initialUsers }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncPending, startSyncTransition] = useTransition();
  const [newsSyncPending, startNewsSyncTransition] = useTransition();
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [syncAllPending, setSyncAllPending] = useState(false);
  const [syncTimes, setSyncTimes] = useState(lastSyncTimes);
  const [clearSlug, setClearSlug] = useState("");
  const [clearRound, setClearRound] = useState("");
  const [clearPending, startClearTransition] = useTransition();
  const [notifSlug, setNotifSlug] = useState("f1");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifPending, startNotifTransition] = useTransition();

  function addToast(ok: boolean, message: string) {
    const id = ++toastId;
    setToasts((p) => [...p, { id, ok, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }

  async function handleSyncAll() {
    setSyncAllPending(true);
    for (const slug of ALL_SERIES) {
      setSyncingSlug(slug);
      const result = await syncSeriesAction(slug);
      if (result.ok) setSyncTimes((p) => ({ ...p, [slug]: new Date().toISOString() }));
      addToast(result.ok, `${slug.toUpperCase()}: ${result.message}`);
    }
    setSyncingSlug(null);
    setSyncAllPending(false);
  }

  function handleSync(slug: string) {
    setSyncingSlug(slug);
    startSyncTransition(async () => {
      const result = await syncSeriesAction(slug);
      setSyncingSlug(null);
      if (result.ok) setSyncTimes((p) => ({ ...p, [slug]: new Date().toISOString() }));
      addToast(result.ok, `${slug.toUpperCase()}: ${result.message}`);
    });
  }

  function handleClear() {
    const round = parseInt(clearRound);
    if (!clearSlug || !round) return;
    startClearTransition(async () => {
      const result = await clearRaceDetailAction(clearSlug, round);
      addToast(result.ok, result.message);
      if (result.ok) { setClearSlug(""); setClearRound(""); }
    });
  }

  function handleNewsSync() {
    startNewsSyncTransition(async () => {
      const result = await syncNewsAction();
      addToast(result.ok, result.message);
    });
  }

  function handleNotif() {
    startNotifTransition(async () => {
      const result = await sendTestNotifAction(notifSlug, notifTitle, notifBody);
      addToast(result.ok, result.message);
      if (result.ok) { setNotifTitle(""); setNotifBody(""); }
    });
  }

  const maxSubs = Math.max(...Object.values(stats.subscriptionsBySeries), 1);

  return (
    <div className="space-y-4">
      {/* Toasts */}
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-lg text-white pointer-events-auto",
              t.ok ? "bg-green-600" : "bg-destructive"
            )}
          >
            {t.ok
              ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={stats.totalUsers}        label="Kullanıcı"    accent="#22c55e" />
        <StatCard value={stats.pendingUsers}       label="Bekleyen"     accent="#f59e0b" />
        <StatCard value={stats.activeSubscriptions} label="Abonelik"   accent="#3b82f6" />
        <StatCard value={stats.activeSessions}     label="Aktif oturum" accent="#a855f7" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-1.5 text-[11px]">
            <Users className="w-3 h-3 shrink-0" />
            <span>Kullanıcılar</span>
            {stats.pendingUsers > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white leading-none">
                {stats.pendingUsers}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-1.5 text-[11px]">
            <RefreshCw className="w-3 h-3 shrink-0" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5 text-[11px]">
            <Bell className="w-3 h-3 shrink-0" />
            Bildirim
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 text-[11px]">
            <Settings className="w-3 h-3 shrink-0" />
            Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* ── Users ── */}
        <TabsContent value="users" className="mt-3">
          <UsersTable initialUsers={initialUsers} />
        </TabsContent>

        {/* ── Sync ── */}
        <TabsContent value="sync" className="mt-3 space-y-4">
          <section className="rounded-xl bg-card border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Tüm seriler</p>
            <button
              onClick={handleSyncAll}
              disabled={syncPending || syncAllPending}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors",
                "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {syncAllPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {syncingSlug?.toUpperCase()} syncleniyor…</>
                : <><RefreshCw className="w-4 h-4" /> Tümünü Sync Et</>}
            </button>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ALL_SERIES.map((slug) => {
                const isLoading = (syncPending || syncAllPending) && syncingSlug === slug;
                const dotColor = syncDotColor(syncTimes[slug] ?? null);
                return (
                  <button
                    key={slug}
                    onClick={() => handleSync(slug)}
                    disabled={syncPending || syncAllPending}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors",
                      "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: SERIES_COLOR[slug] ?? "currentColor" }}
                      >
                        {slug}
                      </span>
                      {isLoading
                        ? <Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
                        : <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />}
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {formatRelative(syncTimes[slug] ?? null)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl bg-card border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Race detail cache temizle</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={clearSlug}
                onChange={(e) => setClearSlug(e.target.value)}
                className="w-full sm:flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seri seç</option>
                {ALL_SERIES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
              </select>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Round"
                  value={clearRound}
                  onChange={(e) => setClearRound(e.target.value)}
                  className="flex-1 sm:w-24 sm:flex-none rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleClear}
                  disabled={clearPending || !clearSlug || !clearRound}
                  className={cn(
                    "flex items-center justify-center rounded-md bg-destructive px-3 py-2 text-destructive-foreground",
                    "hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  )}
                >
                  {clearPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </section>

          {/* News sync */}
          <section className="rounded-xl bg-card border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Haberler</p>
            <button
              onClick={handleNewsSync}
              disabled={newsSyncPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border text-sm hover:bg-white/5 disabled:opacity-50 transition-colors"
            >
              {newsSyncPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Haberleri Sync Et
            </button>
          </section>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="mt-3 space-y-4">
          <section className="rounded-xl bg-card border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Abonelik dağılımı</p>
            {Object.keys(stats.subscriptionsBySeries).length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz abonelik yok.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.subscriptionsBySeries)
                  .sort((a, b) => b[1] - a[1])
                  .map(([slug, cnt]) => (
                    <div key={slug} className="flex items-center gap-3">
                      <span
                        className="text-[11px] font-bold uppercase tracking-wider w-20 shrink-0"
                        style={{ color: SERIES_COLOR[slug] ?? "currentColor" }}
                      >
                        {slug}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(cnt / maxSubs) * 100}%`,
                            backgroundColor: SERIES_COLOR[slug] ?? "#71717a",
                          }}
                        />
                      </div>
                      <span className="text-xs tabular-nums font-mono text-muted-foreground w-4 text-right shrink-0">{cnt}</span>
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section className="rounded-xl bg-card border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Bildirim gönder</p>
            <select
              value={notifSlug}
              onChange={(e) => setNotifSlug(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {ALL_SERIES.map((s) => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <input
              type="text"
              placeholder="Başlık"
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="İçerik"
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleNotif}
              disabled={notifPending || !notifTitle || !notifBody}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground",
                "hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              )}
            >
              {notifPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              Gönder
            </button>
          </section>
        </TabsContent>

        {/* ── Settings ── */}
        <TabsContent value="settings" className="mt-3">
          <div className="rounded-xl bg-card border border-border p-8 flex flex-col items-center gap-3 text-center">
            <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Ayarlar yakında eklenecek.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
