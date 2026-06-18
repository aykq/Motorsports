import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPendingUserId } from "@/lib/pending-cookie";

export const dynamic = "force-dynamic";

export async function GET() {
  let userId: string | null = null;

  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    userId = await getPendingUserId();
  }

  if (!userId) return Response.json({ status: "unknown" }, { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { status: true },
  });

  if (!user) return Response.json({ status: "unknown" });
  return Response.json({ status: user.status });
}