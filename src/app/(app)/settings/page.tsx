import { auth } from "@/lib/auth";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const session = await auth();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Ayarlar</h1>
      </div>

      <section className="rounded-xl bg-card border border-border p-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Hesap
        </h2>
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback>
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{session?.user?.name ?? "Kullanıcı"}</p>
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
            Çıkış Yap
          </Button>
        </form>
      </section>

      <section className="rounded-xl bg-card border border-border p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Bildirimler
        </h2>
        <p className="text-sm text-muted-foreground">
          Bildirim ayarları Aşama 4&apos;te eklenecek.
        </p>
      </section>
    </div>
  );
}
