import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginError } from "./LoginError";
import { MagicLinkForm } from "./MagicLinkForm";
import { getPendingUserId } from "@/lib/pending-cookie";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const pendingUserId = await getPendingUserId();
  if (pendingUserId) redirect("/pending");

  const params = await searchParams;
  const t = await getTranslations("login");
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center items-baseline gap-0.5">
            <span className="font-display text-4xl font-bold uppercase tracking-tight text-brand">MS</span>
            <span className="font-display text-4xl font-bold uppercase tracking-tight text-foreground">Hub</span>
          </div>
          <p className="text-muted-foreground text-sm">{t("tagline")}</p>
        </div>

        {params.error && (
          <LoginError message={params.error === "AccessDenied" ? t("blocked") : t("error")} />
        )}

        <div className="space-y-4">
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button type="submit" className="w-full" variant="outline">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("googleSignIn")}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">{t("or")}</span>
            <Separator className="flex-1" />
          </div>

          <MagicLinkForm />

          {isDev && (
            <>
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-amber-500 font-medium">dev only</span>
                <Separator className="flex-1" />
              </div>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const email = formData.get("email") as string;
                  await signIn("dev-credentials", { email, redirectTo: "/" });
                }}
                className="space-y-3"
              >
                <Input
                  name="email"
                  type="email"
                  placeholder="dev@test.com"
                  required
                  defaultValue="dev@test.com"
                />
                <Button type="submit" variant="outline" className="w-full border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
                  {t("devLogin")}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
