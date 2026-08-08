import type { Page } from "@playwright/test";

// Forces the English locale so tab/button labels are deterministic —
// the app's default locale is Turkish (src/i18n/request.ts:5).
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "en",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/login");
  // Matches the dev-login form's default value (src/app/(auth)/login/page.tsx:94),
  // which is the ADMIN_EMAIL from .env.test — first login auto-promotes to admin
  // (src/lib/auth.ts:154).
  await page.getByRole("button", { name: /dev login/i }).click();
  await page.waitForURL("/");
}
