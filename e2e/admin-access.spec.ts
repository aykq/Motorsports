import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test("admin can log in and reach the admin panel", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin");

  await expect(page.getByRole("tab", { name: "Logs" })).toBeVisible();
});
