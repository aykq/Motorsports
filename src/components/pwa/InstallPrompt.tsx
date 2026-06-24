"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Share, Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "pwa-install-dismissed";
const SESSION_KEY = "pwa-install-snoozed";

// "ios" → manual share sheet · "prompt" → native install (Chromium mobile+desktop)
// "desktop" → manual hint for desktop browsers without beforeinstallprompt
type Platform = "ios" | "prompt" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const t = useTranslations("installPrompt");
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const reveal = () => {
      setShow(true);
      setTimeout(() => setVisible(true), 50);
    };

    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);
    const isDesktop = !isIOS && !isAndroid && !/mobile/i.test(ua);

    if (isIOS) {
      const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
      if (!isSafari) return;
      setPlatform("ios");
      const timer = setTimeout(reveal, 2000);
      return () => clearTimeout(timer);
    }

    let captured = false;
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const handler = (e: Event) => {
      e.preventDefault();
      captured = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("prompt");
      showTimer = setTimeout(reveal, 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Desktop browsers that never fire beforeinstallprompt (Safari, Firefox) →
    // show a manual install hint instead.
    if (isDesktop) {
      fallbackTimer = setTimeout(() => {
        if (!captured) {
          setPlatform("desktop");
          reveal();
        }
      }, 3500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (showTimer) clearTimeout(showTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const remindLater = () => {
    setVisible(false);
    sessionStorage.setItem(SESSION_KEY, "1");
    setTimeout(() => setShow(false), 300);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    setTimeout(() => setShow(false), 300);
  };

  if (!show || !platform) return null;

  return (
    <div
      className={cn(
        "fixed z-50 left-4 right-4 bottom-20 transition-all duration-300 ease-out",
        "md:left-auto md:right-4 md:bottom-4 md:w-80",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <div className="rounded-2xl bg-card border border-border shadow-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <span className="font-display text-lg font-bold uppercase leading-none text-brand">MS</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t("title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("description")}</p>
          </div>
        </div>

        {platform === "ios" ? (
          <>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
              <Share className="w-3.5 h-3.5 shrink-0 text-foreground" />
              <span>{t("iosInstruction")}</span>
              <Plus className="w-3.5 h-3.5 shrink-0 text-foreground ml-auto" />
            </div>
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={remindLater}>
              {t("gotIt")}
            </Button>
          </>
        ) : platform === "desktop" ? (
          <>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2.5">
              <Download className="w-3.5 h-3.5 shrink-0 text-foreground" />
              <span>{t("desktopInstruction")}</span>
            </div>
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={remindLater}>
              {t("gotIt")}
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={remindLater}>
              {t("notNow")}
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-brand hover:bg-brand/90 text-white border-0"
              onClick={install}
            >
              {t("install")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
