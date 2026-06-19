"use client";

import { useState, useEffect, useCallback } from "react";
import { DEFAULT_SESSION_TYPES } from "@/lib/session-types";

export type NotificationPermission = "default" | "granted" | "denied";

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isSecureContext: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  enabledSeries: string[];
  sessionPreferences: Record<string, string[]>;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  toggleSeries: (seriesSlug: string) => Promise<void>;
  toggleSessionType: (seriesSlug: string, sessionType: string) => Promise<void>;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const STORAGE_KEY = "motorsports:notification_series";
const PREFS_STORAGE_KEY = "motorsports:notification_session_prefs";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStorage(series: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(series));
  } catch {}
}

function readPrefsStorage(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

function writePrefsStorage(prefs: Record<string, string[]>) {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [enabledSeries, setEnabledSeriesRaw] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return readStorage();
  });
  const [sessionPreferences, setSessionPreferencesRaw] = useState<Record<string, string[]>>(() => {
    if (typeof window === "undefined") return {};
    return readPrefsStorage();
  });

  const setEnabledSeries = useCallback((series: string[]) => {
    setEnabledSeriesRaw(series);
    writeStorage(series);
  }, []);

  const setSessionPreferences = useCallback((prefs: Record<string, string[]>) => {
    setSessionPreferencesRaw(prefs);
    writePrefsStorage(prefs);
  }, []);

  useEffect(() => {
    const secure = window.isSecureContext;
    setIsSecureContext(secure);
    const supported =
      secure &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);
    if (!supported) return;

    setPermission(Notification.permission as NotificationPermission);
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then(async (sub) => {
        setSubscription(sub);
        if (!sub) return;

        try {
          const res = await fetch(
            `/api/notifications/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`
          );

          if (res.ok) {
            const data = (await res.json()) as {
              seriesEnabled: string[];
              sessionPreferences: Record<string, string[]>;
            };
            setEnabledSeries(data.seriesEnabled ?? []);
            setSessionPreferences(data.sessionPreferences ?? {});
          } else if (res.status === 404) {
            const json = sub.toJSON();
            const currentSeries = readStorage();
            const currentPrefs = readPrefsStorage();
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: sub.endpoint,
                keys: json.keys,
                seriesEnabled: currentSeries,
                sessionPreferences: currentPrefs,
              }),
            });
          }
        } catch {}
      });
    });
  }, [setEnabledSeries, setSessionPreferences]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    const result = await Notification.requestPermission();
    setPermission(result as NotificationPermission);
    return result === "granted";
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || permission !== "granted") return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as ArrayBuffer,
      });
      const json = sub.toJSON();
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: json.keys,
          seriesEnabled: enabledSeries,
          sessionPreferences,
        }),
      });
      setSubscription(sub);
      return true;
    } catch {
      return false;
    }
  }, [isSupported, permission, enabledSeries, sessionPreferences]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    try {
      await fetch("/api/notifications/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
      setEnabledSeries([]);
      setSessionPreferences({});
      return true;
    } catch {
      return false;
    }
  }, [subscription, setEnabledSeries, setSessionPreferences]);

  const toggleSeries = useCallback(
    async (seriesSlug: string): Promise<void> => {
      if (!subscription) return;
      const next = enabledSeries.includes(seriesSlug)
        ? enabledSeries.filter((s) => s !== seriesSlug)
        : [...enabledSeries, seriesSlug];

      setEnabledSeries(next);
      await fetch("/api/notifications/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint, seriesEnabled: next }),
      });
    },
    [subscription, enabledSeries, setEnabledSeries]
  );

  const toggleSessionType = useCallback(
    async (seriesSlug: string, sessionType: string): Promise<void> => {
      if (!subscription) return;

      const current = sessionPreferences[seriesSlug] ?? [...DEFAULT_SESSION_TYPES];
      const next = current.includes(sessionType)
        ? current.filter((t) => t !== sessionType)
        : [...current, sessionType];

      const nextPrefs = { ...sessionPreferences, [seriesSlug]: next };
      setSessionPreferences(nextPrefs);
      await fetch("/api/notifications/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint, sessionPreferences: nextPrefs }),
      });
    },
    [subscription, sessionPreferences, setSessionPreferences]
  );

  return {
    permission,
    isSupported,
    isSecureContext,
    isSubscribed: subscription !== null,
    subscription,
    enabledSeries,
    sessionPreferences,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSeries,
    toggleSessionType,
  };
}
