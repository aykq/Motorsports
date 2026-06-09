import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { PendingClient } from "./PendingClient";

export default async function PendingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = session.user?.id;
  if (!userId) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { status: true },
  });

  if (!user) redirect("/login");
  if (user.status === "approved") redirect("/");
  if (user.status === "blocked") redirect("/login?error=AccessDenied");

  return (
    <PendingClient
      userName={session.user?.name ?? null}
      userEmail={session.user?.email ?? null}
    />
  );
}
