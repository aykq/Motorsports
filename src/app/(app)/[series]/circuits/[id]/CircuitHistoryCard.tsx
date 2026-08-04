"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tr: string | null;
  en: string | null;
  links: { url: string; label: string }[];
  initialLocale: string;
  color: string;
}

export function CircuitHistoryCard({ tr, en, links, initialLocale, color }: Props) {
  const t = useTranslations("circuitsPage");
  const [lang, setLang] = useState<"tr" | "en">(initialLocale === "tr" && tr ? "tr" : en ? "en" : "tr");

  const text = lang === "tr" ? (tr ?? en) : (en ?? tr);
  const hasBothLanguages = Boolean(tr && en);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xs font-semibold text-muted-foreground tracking-wide">
          {t("historyTitle")}
        </h2>
        {hasBothLanguages && (
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <button
              onClick={() => setLang("tr")}
              className={cn(
                "px-1.5 py-0.5 rounded transition-colors",
                lang === "tr" ? "bg-accent text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              TR
            </button>
            <span className="text-muted-foreground">/</span>
            <button
              onClick={() => setLang("en")}
              className={cn(
                "px-1.5 py-0.5 rounded transition-colors",
                lang === "en" ? "bg-accent text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
          </div>
        )}
      </div>
      <div
        className="relative rounded-lg border border-border p-4 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}20 0%, ${color}05 50%, transparent 100%)`,
        }}
      >
        <p key={lang} className="relative text-sm leading-relaxed whitespace-pre-line animate-in fade-in duration-200">
          {text}
        </p>
      </div>
      {links.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground tracking-wide">{t("relatedLinks")}</p>
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
              >
                <ExternalLink className="w-3 h-3" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
