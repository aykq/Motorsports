import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { status: true },
  });

  if (!user) {
    return NextResponse.json({ status: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({ status: user.status });
}
