import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { TEST_ADMIN_ID, seedAdminUser, resetUsersTable } from "./db-test-helpers";

describe("db-test-helpers", () => {
  beforeEach(async () => {
    await resetUsersTable();
  });

  it("seedAdminUser creates an approved admin row", async () => {
    await seedAdminUser();
    const row = await db.query.users.findFirst({ where: eq(users.id, TEST_ADMIN_ID) });
    expect(row?.role).toBe("admin");
    expect(row?.status).toBe("approved");
  });

  it("resetUsersTable removes previously seeded rows", async () => {
    await seedAdminUser();
    await resetUsersTable();
    const row = await db.query.users.findFirst({ where: eq(users.id, TEST_ADMIN_ID) });
    expect(row).toBeUndefined();
  });
});
