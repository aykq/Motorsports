"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { SERIES_LIST } from "@/lib/series-config";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export function NotificationSettings() {
  const t = useTranslations("settings.notifications");
  const {
    permission,
    isSupported,
    isSecureContext,
    isSubscribed,
    enabledSeries,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSeries,
  } = useNotifications();

  if (!isSupported) {
    return (
      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {!isSecureContext ? t("httpsRequired") : t("notSupported")}
        </p>
      </section>
    );
  }

  const handleEnable = async () => {
    if (permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return;
    }
    await subscribe();
  };

  const availableSeries = SERIES_LIST.filter((s) => s.available);

  return (
    <section className="rounded-xl bg-card border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {t("title")}
        </h2>
        {isSubscribed ? (
          <BellRing className="w-4 h-4 text-primary" />
        ) : (
          <BellOff className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {permission === "denied" ? (
        <p className="text-sm text-destructive">{t("denied")}</p>
      ) : !isSubscribed ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("description")}</p>
          <Button onClick={handleEnable} className="w-full cursor-pointer gap-2">
            <Bell className="w-4 h-4" />
            {t("enable")}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t("seriesQuestion")}</p>

          <div className="space-y-3">
            {availableSeries.map((series) => (
              <div key={series.slug} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: series.color }}
                  />
                  <span className="text-sm font-medium">{series.name}</span>
                </div>
                <Switch
                  checked={enabledSeries.includes(series.slug)}
                  onCheckedChange={() => toggleSeries(series.slug)}
                  className={cn("cursor-pointer")}
                />
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={unsubscribe}
            className="w-full cursor-pointer text-muted-foreground"
          >
            {t("disable")}
          </Button>
        </div>
      )}
    </section>
  );
}
