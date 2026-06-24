import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SeriesAccent } from "@/components/layout/SeriesAccent";
import { PreferenceSyncer } from "@/components/layout/PreferenceSyncer";
import { SessionGuard } from "@/components/layout/SessionGuard";
import { PageTransitionWrapper } from "@/components/layout/PageTransitionWrapper";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import dynamic from "next/dynamic";

// DevSyncPanel: local-only dev tool, gitignored — dosya yoksa sessizce atlanır
const DevSyncPanel =
  process.env.NODE_ENV === "development"
    ? dynamic(() =>
        import("@/components/dev/DevSyncPanel")
          .then((m) => ({ default: m.DevSyncPanel }))
          .catch(() => ({ default: () => null }))
      )
    : null;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const userPrefs = session.user?.id
    ? await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { language: true, theme: true, status: true, role: true },
      })
    : null;

  if (!userPrefs) redirect("/login");
  if (userPrefs.status === "blocked") redirect("/blocked");
  if (userPrefs.status !== "approved") redirect("/pending");

  return (
    <div className="flex min-h-screen">
      <SeriesAccent />
      <SessionGuard />
      <PreferenceSyncer
        dbLanguage={userPrefs.language ?? null}
        dbTheme={userPrefs.theme ?? null}
      />
      <Sidebar
        user={{ name: session.user?.name, email: session.user?.email, image: session.user?.image }}
        isAdmin={userPrefs.role === "admin"}
      />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>
      <BottomNav isAdmin={userPrefs.role === "admin"} />
      <InstallPrompt />
      {DevSyncPanel && <DevSyncPanel />}
    </div>
  );
}
