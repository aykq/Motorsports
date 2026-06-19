"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { SERIES_LIST } from "@/lib/series-config";
import {
  getSessionTypesForSeries,
  getSessionTypeConfig,
  DEFAULT_SESSION_TYPES,
} from "@/lib/session-types";
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
    sessionPreferences,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSeries,
    toggleSessionType,
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

  const availableSeries = SERIES_LIST.filter((s) => s.available && !s.hidden);

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

          <div className="space-y-2">
            {availableSeries.map((series) => {
              const isSeriesEnabled = enabledSeries.includes(series.slug);
              const sessionTypes = getSessionTypesForSeries(series.slug);
              const enabledTypes = sessionPreferences[series.slug] ?? [...DEFAULT_SESSION_TYPES];

              return (
                <div key={series.slug} className="rounded-lg border border-border overflow-hidden">
                  {/* Seri başlığı ve toggle */}
                  <div className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: series.color }}
                      />
                      <span className="text-sm font-medium">{series.name}</span>
                    </div>
                    <Switch
                      checked={isSeriesEnabled}
                      onCheckedChange={() => toggleSeries(series.slug)}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Seans tipi toggle'ları — sadece seri aktifken görünür */}
                  {isSeriesEnabled && (
                    <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1.5">
                      {sessionTypes.map((typeId) => {
                        const config = getSessionTypeConfig(typeId);
                        if (!config) return null;
                        return (
                          <div
                            key={typeId}
                            className="flex items-center justify-between py-0.5"
                          >
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span>{config.icon}</span>
                              <span>{config.labelTr}</span>
                            </span>
                            <Switch
                              checked={enabledTypes.includes(typeId)}
                              onCheckedChange={() => toggleSessionType(series.slug, typeId)}
                              className={cn("cursor-pointer scale-75 origin-right")}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
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
