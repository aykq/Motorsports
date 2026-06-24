import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, accounts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyApprovalToken } from "@/lib/admin-token";
import { ApproveActions } from "./ApproveActions";
import { requireAdmin } from "@/lib/admin-guard";
import { getTranslations } from "next-intl/server";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-destructive">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default async function AdminApprovePage({ searchParams }: Props) {
  const adminId = await requireAdmin();
  if (!adminId) redirect("/");

  const t = await getTranslations("admin");
  const statusLabelPast: Record<string, string> = {
    approved: t("statusApprovedPast"),
    blocked: t("statusBlockedPast"),
  };

  const { token } = await searchParams;
  if (!token) return <ErrorPage title={t("error")} message={t("tokenMissing")} />;

  const payload = verifyApprovalToken(token);
  if (!payload) return <ErrorPage title={t("error")} message={t("linkInvalid")} />;

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

  if (!targetUser) return <ErrorPage title={t("error")} message={t("userNotFound")} />;

  if (targetUser.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">{t("alreadyProcessed")}</p>
          <p className="text-sm text-muted-foreground">
            {targetUser.name ?? targetUser.email} — {statusLabelPast[targetUser.status] ?? targetUser.status}
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
