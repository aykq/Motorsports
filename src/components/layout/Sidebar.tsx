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
  const tAccount = useTranslations("settings.account");

  const NAV_ITEMS = [
    { href: "/", label: t("calendar"), icon: CalendarDays },
    { href: "/series", label: t("series"), icon: Grid2X2 },
    { href: "/favorites", label: t("favorites"), icon: Heart },
    { href: "/news", label: t("news"), icon: Newspaper },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  const items = [...NAV_ITEMS, ...(isAdmin ? [{ href: "/admin", label: t("admin"), icon: Users }] : [])];

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 px-3.5 py-4.5">
      <Link href="/" className="flex items-center gap-2.5 px-2 pb-5">
        <span className="inline-flex items-center justify-center size-7 rounded-lg bg-brand text-white font-display font-bold text-[15px] leading-none">MS</span>
        <span className="font-display font-bold text-[22px] tracking-tight leading-none">Hub</span>
      </Link>

      <nav className="flex-1 space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "text-[var(--series)] bg-[color-mix(in_oklch,var(--series)_13%,transparent)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--series)]" />}
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 pt-3 border-t border-border space-y-3">
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
            <p className="text-sm font-medium truncate">{user.name ?? tAccount("defaultUser")}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
