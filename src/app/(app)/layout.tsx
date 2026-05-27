import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
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

  return (
    <div className="flex min-h-screen">
      <Sidebar user={{}} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      <BottomNav />
      {DevSyncPanel && <DevSyncPanel />}
    </div>
  );
}
