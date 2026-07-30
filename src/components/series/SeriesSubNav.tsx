"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LayoutGrid, CalendarDays, Trophy, User, Car, MapPin, type LucideIcon } from "lucide-react";

export type SeriesSubNavKey = "overview" | "schedule" | "standings" | "drivers" | "teams" | "circuits";

interface SeriesSubNavProps {
  slug: string;
  color: string;
  active: SeriesSubNavKey;
}

const ITEMS: { key: SeriesSubNavKey; href: (slug: string) => string; icon: LucideIcon }[] = [
  { key: "overview", href: (s) => `/${s}`, icon: LayoutGrid },
  { key: "schedule", href: (s) => `/${s}/schedule`, icon: CalendarDays },
  { key: "standings", href: (s) => `/${s}/standings`, icon: Trophy },
  { key: "drivers", href: (s) => `/${s}/drivers`, icon: User },
  { key: "teams", href: (s) => `/${s}/teams`, icon: Car },
  { key: "circuits", href: (s) => `/${s}/circuits`, icon: MapPin },
];

export function SeriesSubNav({ slug, color, active }: SeriesSubNavProps) {
  const t = useTranslations("seriesPage");

  return (
    <nav
      className={cn(
        "flex gap-1 bg-card/60 border border-border rounded-xl p-1 overflow-x-auto",
        "[scrollbar-width:thin] [scrollbar-color:theme(colors.border)_transparent]",
        "[&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border",
        "hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40"
      )}
    >
      {ITEMS.map(({ key, href, icon: Icon }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href(slug)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors",
              isActive ? "font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
            style={isActive ? { backgroundColor: `color-mix(in oklch, ${color} 16%, transparent)`, color } : undefined}
          >
            <Icon className="w-3.5 h-3.5" />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
