import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function SettingsPage() {
  const session = await auth();
  const t = await getTranslations("settings");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
      </div>

      {/* Account */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {t("account.title")}
        </h2>
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback>
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{session?.user?.name ?? t("account.defaultUser")}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
          </div>
        </div>
        <Separator />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <Button type="submit" variant="destructive" className="w-full">
            {t("account.signOut")}
          </Button>
        </form>
      </section>

      {/* Appearance */}
      <section className="rounded-xl bg-card border border-border p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          {t("appearance.title")}
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("appearance.language")}</span>
          <LanguageToggle />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("appearance.theme")}</span>
          <ThemeToggle />
        </div>
      </section>

      <NotificationSettings />
    </div>
  );
}
