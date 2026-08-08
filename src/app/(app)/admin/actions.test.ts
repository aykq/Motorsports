import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { db } from "@/db";
import { errorLog } from "@/db/schema";
import { getErrorLogAction, getErrorLogBadgeCountAction } from "./actions";
import { TEST_ADMIN_ID, seedAdminUser, resetUsersTable, resetErrorLogTable } from "@/test/db-test-helpers";

const mockedAuth = vi.mocked(auth);

async function insertLog(overrides: Partial<typeof errorLog.$inferInsert> = {}) {
  await db.insert(errorLog).values({
    source: "cron/race-details",
    severity: "error",
    message: "boom",
    createdAt: new Date(),
    ...overrides,
  });
}

beforeEach(async () => {
  await resetErrorLogTable();
  await resetUsersTable();
  await seedAdminUser();
  mockedAuth.mockResolvedValue({ user: { id: TEST_ADMIN_ID } } as never);
});

describe("getErrorLogAction", () => {
  it("returns all rows ordered newest-first when no filter is given", async () => {
    await insertLog({ message: "older", createdAt: new Date(Date.now() - 60_000) });
    await insertLog({ message: "newer", createdAt: new Date() });

    const rows = await getErrorLogAction({});

    expect(rows.map((r) => r.message)).toEqual(["newer", "older"]);
  });

  it("filters by source", async () => {
    await insertLog({ source: "cron/race-details" });
    await insertLog({ source: "admin/syncSeries" });

    const rows = await getErrorLogAction({ source: "admin/syncSeries" });

    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe("admin/syncSeries");
  });

  it("filters by severity", async () => {
    await insertLog({ severity: "error" });
    await insertLog({ severity: "warning" });

    const rows = await getErrorLogAction({ severity: "warning" });

    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBe("warning");
  });

  it("paginates with limit and offset", async () => {
    for (let i = 0; i < 5; i++) {
      await insertLog({ message: `row-${i}`, createdAt: new Date(Date.now() - i * 1000) });
    }

    const page1 = await getErrorLogAction({ limit: 2, offset: 0 });
    const page2 = await getErrorLogAction({ limit: 2, offset: 2 });

    expect(page1.map((r) => r.message)).toEqual(["row-0", "row-1"]);
    expect(page2.map((r) => r.message)).toEqual(["row-2", "row-3"]);
  });

  it("throws Unauthorized when there is no session", async () => {
    mockedAuth.mockResolvedValue(null as never);

    await expect(getErrorLogAction({})).rejects.toThrow("Unauthorized");
  });
});

describe("getErrorLogBadgeCountAction", () => {
  it("counts only error-severity rows from the last 24 hours", async () => {
    const now = new Date();
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    await insertLog({ severity: "error", createdAt: now });
    await insertLog({ severity: "error", createdAt: twentyFiveHoursAgo });
    await insertLog({ severity: "warning", createdAt: now });

    const count = await getErrorLogBadgeCountAction();

    expect(count).toBe(1);
  });
});
