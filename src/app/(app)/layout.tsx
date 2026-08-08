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
import { getShowNonF1Series } from "@/lib/app-settings";

// DevSyncPanel: local-only dev tool, gitignored — dosya yoksa sessizce atlanır.
// The path is built from parts (not a string/template literal) so the
// bundler can't statically resolve it at build/compile time — a literal
// `import("@/components/dev/DevSyncPanel")` fails as a hard "Module not
// found" compile error on any checkout where the gitignored file doesn't
// exist (e.g. CI), which the .catch() below can't help with since that
// only handles a runtime rejection, not a build-time resolution failure.
const DEV_SYNC_PANEL_PATH = ["@/components/dev", "DevSyncPanel"].join("/");
const DevSyncPanel =
  process.env.NODE_ENV === "development"
    ? dynamic(() =>
        import(DEV_SYNC_PANEL_PATH)
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

  const [userPrefs, showNonF1Series] = await Promise.all([
    session?.user?.id
      ? db.query.users.findFirst({
          where: eq(users.id, session.user.id),
          columns: { language: true, theme: true, status: true, role: true },
        })
      : Promise.resolve(null),
    getShowNonF1Series(),
  ]);

  // proxy only checks the JWT status claim, not whether the DB row still exists —
  // this guards a session/DB desync (e.g. user deleted after the JWT was minted)
  if (!session || !userPrefs) redirect("/login");

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
        showNonF1Series={showNonF1Series}
      />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <PageTransitionWrapper>{children}</PageTransitionWrapper>
      </main>
      <BottomNav isAdmin={userPrefs.role === "admin"} showNonF1Series={showNonF1Series} />
      <InstallPrompt />
      {DevSyncPanel && <DevSyncPanel />}
    </div>
  );
}
