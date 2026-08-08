import type { Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Forces the English locale so tab/button labels are deterministic —
// the app's default locale is Turkish (src/i18n/request.ts:5).
export async function loginAsAdmin(page: Page): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? "dev@test.com";

  // The dev-credentials provider's authorize() (src/lib/auth.ts:23-42) creates
  // the user row itself, bypassing the DrizzleAdapter's own createUser flow —
  // so NextAuth's `isNewUser` never fires for it, which means the ADMIN_EMAIL
  // auto-promotion in events.signIn (src/lib/auth.ts:154) never runs for a
  // dev-login. Pre-seeding the row as an already-admin user sidesteps that
  // entirely: authorize() just finds the existing row and returns it as-is.
  await pool.query(
    `insert into "user" (id, email, name, role, status)
     values (gen_random_uuid(), $1, 'dev', 'admin', 'approved')
     on conflict (email) do update set role = 'admin', status = 'approved'`,
    [email]
  );

  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "en",
      domain: "localhost",
      path: "/",
    },
  ]);

  await page.goto("/login");
  // Matches the dev-login form's default value (src/app/(auth)/login/page.tsx:94).
  await page.getByRole("button", { name: /dev login/i }).click();
  await page.waitForURL("/");
}
