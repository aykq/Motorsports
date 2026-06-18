import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BlockedClient } from "./BlockedClient";

export default async function BlockedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });

  if (!dbUser) redirect("/force-signout");
  if (dbUser.status === "approved") redirect("/");
  if (dbUser.status === "pending") redirect("/pending");

  return (
    <BlockedClient
      userEmail={session.user.email ?? null}
      userName={session.user.name ?? null}
    />
  );
}
