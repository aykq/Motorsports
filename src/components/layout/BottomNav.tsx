"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Grid2X2, Heart, Settings, Users } from "lucide-react";
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
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all duration-200",
                active
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform duration-200", active && "scale-110")} />
              <span className={cn("transition-all duration-200", active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin/users"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all duration-200",
              pathname.startsWith("/admin")
                ? "text-rose-500"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className={cn("w-5 h-5 transition-transform duration-200", pathname.startsWith("/admin") && "scale-110")} />
            <span className={cn("transition-all duration-200", pathname.startsWith("/admin") && "font-semibold")}>Yönetim</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
