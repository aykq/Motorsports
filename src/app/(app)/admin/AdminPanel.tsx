"use client";

import { useTransition, useState } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, Trash2, Bell, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { syncSeriesAction, clearRaceDetailAction, sendTestNotifAction } from "./actions";

const ALL_SERIES = ["f1", "wec", "motogp", "moto2", "moto3", "gt3", "gt4", "carrera-cup"] as const;

interface Toast {
  id: number;
  ok: boolean;
  message: string;
}

let toastId = 0;

interface Props {
  lastSyncTimes: Record<string, string | null>;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminPanel({ lastSyncTimes }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [syncPending, startSyncTransition] = useTransition();
  const [clearSlug, setClearSlug] = useState("");
  const [clearRound, setClearRound] = useState("");
  const [clearPending, startClearTransition] = useTransition();
  const [notifSlug, setNotifSlug] = useState("f1");
  const [notifTitle, setNotifTitle] = useState("🏁 Test Bildirimi");
  const [notifBody, setNotifBody] = useState("Bu bir test bildirimidir.");
  const [notifPending, startNotifTransition] = useTransition();
  const [syncingSlug, setSyncingSlug] = useState<string | null>(null);
  const [syncAllPending, setSyncAllPending] = useState(false);
  const [syncTimes, setSyncTimes] = useState(lastSyncTimes);

  function addToast(ok: boolean, message: string) {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, ok, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }

  async function handleSyncAll() {
    setSyncAllPending(true);
    for (const slug of ALL_SERIES) {
      setSyncingSlug(slug);
      const result = await syncSeriesAction(slug);
      if (result.ok) {
        setSyncTimes((prev) => ({ ...prev, [slug]: new Date().toISOString() }));
      }
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
      if (result.ok) {
        setSyncTimes((prev) => ({ ...prev, [slug]: new Date().toISOString() }));
      }
      addToast(result.ok, `${slug.toUpperCase()}: ${result.message}`);
    });
  }

  function handleClear() {
    const round = parseInt(clearRound);
    if (!clearSlug || !round) return;
    startClearTransition(async () => {
      const result = await clearRaceDetailAction(clearSlug, round);
      addToast(result.ok, result.message);
      if (result.ok) {
        setClearSlug("");
        setClearRound("");
      }
    });
  }

  function handleNotif() {
    startNotifTransition(async () => {
      const result = await sendTestNotifAction(notifSlug, notifTitle, notifBody);
      addToast(result.ok, result.message);
    });
  }

  return (
    <div className="space-y-6">
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
            {t.ok ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* Series Sync */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Series Sync</h2>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={syncPending || syncAllPending}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold transition-colors",
            "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {syncAllPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Syncing {syncingSlug?.toUpperCase()}…</>
            : <><RefreshCw className="w-4 h-4" /> Sync All</>
          }
        </button>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALL_SERIES.map((slug) => {
            const isLoading = (syncPending || syncAllPending) && syncingSlug === slug;
            return (
              <button
                key={slug}
                onClick={() => handleSync(slug)}
                disabled={syncPending}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-lg border border-border bg-background px-3 py-2.5 text-left transition-colors",
                  "hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{slug}</span>
                  {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {formatRelative(syncTimes[slug] ?? null)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Clear Race Detail Cache */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Race Detail Cache Temizle</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={clearSlug}
            onChange={(e) => setClearSlug(e.target.value)}
            className="w-full sm:flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seri seç</option>
            {ALL_SERIES.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
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
              title="Temizle"
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

      {/* Test Notification */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Test Bildirimi Gönder</h2>
        </div>
        <div className="space-y-2">
          <select
            value={notifSlug}
            onChange={(e) => setNotifSlug(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {ALL_SERIES.map((s) => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
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
        </div>
      </section>
    </div>
  );
}
