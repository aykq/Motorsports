"use client";

import { useState, useEffect, useCallback } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isSecureContext: boolean;
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  enabledSeries: string[];
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  toggleSeries: (seriesSlug: string) => Promise<void>;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const STORAGE_KEY = "motorsports:notification_series";

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

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  // localStorage'dan anında oku — sekme değişince sıfırlanmaz
  const [enabledSeries, setEnabledSeriesRaw] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    return readStorage();
  });

  const setEnabledSeries = useCallback((series: string[]) => {
    setEnabledSeriesRaw(series);
    writeStorage(series);
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
            // DB'de kayıtlı — DB değeri localStorage'ın üzerine yaz (çok cihaz senkronizasyonu)
            const data = (await res.json()) as { seriesEnabled: string[] };
            setEnabledSeries(data.seriesEnabled ?? []);
          } else if (res.status === 404) {
            // Tarayıcıda subscription var ama DB'de yok (eski kayıt / auth sorunu)
            // localStorage değerini koruyarak DB'ye yeniden kayıt et
            const json = sub.toJSON();
            const currentSeries = readStorage();
            await fetch("/api/notifications/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: sub.endpoint,
                keys: json.keys,
                seriesEnabled: currentSeries,
              }),
            });
            // localStorage zaten doğru değerde, state de doğru — ek bir set gerekmez
          }
        } catch {}
      });
    });
  }, [setEnabledSeries]);

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
        }),
      });
      setSubscription(sub);
      return true;
    } catch {
      return false;
    }
  }, [isSupported, permission, enabledSeries]);

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
      return true;
    } catch {
      return false;
    }
  }, [subscription, setEnabledSeries]);

  const toggleSeries = useCallback(
    async (seriesSlug: string): Promise<void> => {
      if (!subscription) return;
      const next = enabledSeries.includes(seriesSlug)
        ? enabledSeries.filter((s) => s !== seriesSlug)
        : [...enabledSeries, seriesSlug];

      setEnabledSeries(next); // localStorage + state aynı anda güncellenir
      await fetch("/api/notifications/subscribe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint, seriesEnabled: next }),
      });
    },
    [subscription, enabledSeries, setEnabledSeries]
  );

  return {
    permission,
    isSupported,
    isSecureContext,
    isSubscribed: subscription !== null,
    subscription,
    enabledSeries,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSeries,
  };
}
