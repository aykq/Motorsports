import { db } from "@/db";
import { users, errorLog } from "@/db/schema";

export const TEST_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

export async function seedAdminUser(): Promise<void> {
  await db.insert(users).values({
    id: TEST_ADMIN_ID,
    email: "admin@test.local",
    role: "admin",
    status: "approved",
  });
}

export async function resetUsersTable(): Promise<void> {
  await db.delete(users);
}

export async function resetErrorLogTable(): Promise<void> {
  await db.delete(errorLog);
}
