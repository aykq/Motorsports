"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Grid2X2, Heart, Newspaper, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  isAdmin?: boolean;
}

export function Sidebar({ user, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const NAV_ITEMS = [
    { href: "/", label: t("calendar"), icon: CalendarDays },
    { href: "/series", label: t("series"), icon: Grid2X2 },
    { href: "/favorites", label: t("favorites"), icon: Heart },
    { href: "/news", label: t("news"), icon: Newspaper },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-background h-screen sticky top-0">
      <div className="p-5 pb-4">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-2xl font-black text-rose-500">MS</span>
          <span className="text-2xl font-black text-foreground">Hub</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-rose-500/10 text-rose-500"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 shrink-0 transition-transform duration-200", active && "scale-110")} />
              {label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              pathname.startsWith("/admin")
                ? "bg-rose-500/10 text-rose-500"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
          >
            <Users className={cn("w-4.5 h-4.5 shrink-0 transition-transform duration-200", pathname.startsWith("/admin") && "scale-110")} />
            Yönetim
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="flex items-center gap-2 justify-between">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-1 rounded-lg py-1.5 hover:bg-accent transition-colors duration-200 -mx-1"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={user.image ?? undefined} />
            <AvatarFallback className="text-xs bg-muted">
              {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{user.name ?? "Kullanıcı"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
