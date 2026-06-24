"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Grid2X2, Heart, Newspaper, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface BottomNavProps {
  isAdmin?: boolean;
}

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const NAV_ITEMS = [
    { href: "/", label: t("calendar"), icon: CalendarDays },
    { href: "/series", label: t("series"), icon: Grid2X2 },
    { href: "/favorites", label: t("favorites"), icon: Heart },
    { href: "/news", label: t("news"), icon: Newspaper },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  const items = [...NAV_ITEMS, ...(isAdmin ? [{ href: "/admin", label: t("admin"), icon: Users }] : [])];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 md:hidden">
      <div className="flex items-stretch justify-around h-[60px] px-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 text-[10px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                active ? "text-[var(--series)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && <span className="absolute top-0 h-[3px] w-7 rounded-full bg-[var(--series)]" />}
              <Icon className="w-[19px] h-[19px]" />
              <span className={cn(active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
