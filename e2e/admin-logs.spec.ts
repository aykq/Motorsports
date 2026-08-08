import { test, expect } from "@playwright/test";
import { Pool } from "pg";
import { loginAsAdmin } from "./helpers/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SOURCE = "e2e/test";

async function insertErrorLogRow(opts: { severity: "error" | "warning"; message: string }) {
  await pool.query(
    `insert into error_log (id, source, severity, message, created_at) values (gen_random_uuid(), $1, $2, $3, now())`,
    [SOURCE, opts.severity, opts.message]
  );
}

// Each test run leaves its own rows behind (real Postgres, not reset between
// runs like the Vitest suite) — start from a clean slate so a leftover row
// from an earlier run can never satisfy an assertion meant for a fresh one.
test.beforeEach(async () => {
  await pool.query(`delete from error_log where source = $1`, [SOURCE]);
});

test.afterAll(async () => {
  await pool.end();
});

test("new error log rows appear at the top of the list while the Logs tab is active", async ({ page }) => {
  // Installed before any navigation so the poll's setInterval is created
  // under the fake clock from the start — installing after the page has
  // already set up its real interval leaves that interval running on
  // real wall-clock time, unaffected by fastForward.
  await page.clock.install();
  await loginAsAdmin(page);
  await page.goto("/admin");
  await page.getByRole("tab", { name: "Logs" }).click();

  await insertErrorLogRow({ severity: "error", message: "e2e-live-refresh-row" });
  await page.clock.fastForward("00:30");

  const firstRow = page.locator("li").filter({ hasText: "e2e-live-refresh-row" }).first();
  await expect(firstRow).toBeVisible();
  await expect(firstRow).toHaveClass(/animate-in/);
});

test("the error badge updates while a different tab is active", async ({ page }) => {
  await page.clock.install();
  await loginAsAdmin(page);
  await page.goto("/admin");
  // Stay on the default "Users" tab.

  await insertErrorLogRow({ severity: "error", message: "e2e-badge-row" });
  await page.clock.fastForward("00:30");

  await expect(page.getByRole("tab", { name: "Logs" }).locator("span").last()).not.toHaveText("0");
});

test("polling stops while the tab is hidden and resumes when visible again", async ({ page }) => {
  await page.clock.install();
  await loginAsAdmin(page);
  await page.goto("/admin");
  await page.getByRole("tab", { name: "Logs" }).click();

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await insertErrorLogRow({ severity: "error", message: "e2e-hidden-row" });
  await page.clock.fastForward("00:30");
  await expect(page.locator("li").filter({ hasText: "e2e-hidden-row" })).toHaveCount(0);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward("00:30");
  await expect(page.locator("li").filter({ hasText: "e2e-hidden-row" })).toBeVisible();
});
