import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyApprovalToken } from "@/lib/admin-token";
import { ApproveActions } from "./ApproveActions";
import { requireAdmin } from "@/lib/admin-guard";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-destructive">Hata</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = {
  approved: "onaylandı",
  blocked: "engellendi",
};

export default async function AdminApprovePage({ searchParams }: Props) {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/");

  const { token } = await searchParams;
  if (!token) return <ErrorPage message="Token eksik." />;

  const payload = verifyApprovalToken(token);
  if (!payload) return <ErrorPage message="Bu link geçersiz veya süresi dolmuş." />;

  const [targetUser, account] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, payload.userId),
      columns: { id: true, name: true, email: true, image: true, status: true, createdAt: true },
    }),
    db.query.accounts.findFirst({
      where: eq(accounts.userId, payload.userId),
      columns: { provider: true },
    }),
  ]);

  if (!targetUser) return <ErrorPage message="Kullanıcı bulunamadı veya daha önce silindi." />;

  if (targetUser.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Bu kullanıcı zaten işleme alındı.</p>
          <p className="text-sm text-muted-foreground">
            {targetUser.name ?? targetUser.email} — {STATUS_LABELS[targetUser.status] ?? targetUser.status}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ApproveActions
      user={{
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        image: targetUser.image,
        signupAt: targetUser.createdAt.toISOString(),
        provider: account?.provider ?? "unknown",
      }}
      token={token}
    />
  );
}
