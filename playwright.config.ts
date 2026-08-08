import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.test" });

// A dedicated port, distinct from the default 3000 a developer's own
// `npm run dev` normally runs on — otherwise Playwright's
// `reuseExistingServer` silently reuses whatever is already listening on
// 3000 (a real dev server against the real DB) instead of spinning up an
// isolated instance against the test DB, and tests fail confusingly.
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Serial: all tests share one `next dev` server, and dev-mode compiles
  // routes on demand — a cold server hit by several parallel workers at
  // once times out compiling multiple routes simultaneously.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  // CI runners are slower than a local dev machine, and `next dev` compiles
  // each route on-demand on first hit (cold compiles alone measured up to
  // ~40s locally) — the default 30s test / 5s assertion timeouts are tuned
  // for an already-warm local server and are too tight for a CI cold start.
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: {
    timeout: process.env.CI ? 15_000 : 5_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    // The app registers a PWA service worker (the "Add to Home Screen"
    // prompt). On a fresh context its first install/activate can race with
    // navigation and make Playwright's navigation-settled detection hang
    // indefinitely — block it, it has no bearing on what we're testing.
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "development",
      ENABLE_DEV_LOGIN: "1",
    },
  },
});
