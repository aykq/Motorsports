import { describe, it, expect } from "vitest";
import { MIDDLEWARE_MATCHER } from "./middleware-matcher";

// Approximates how Next compiles the matcher: the whole path must match.
const re = new RegExp(`^${MIDDLEWARE_MATCHER}$`);
const runsMiddleware = (path: string) => re.test(path);

describe("MIDDLEWARE_MATCHER", () => {
  it("runs on app pages so auth is enforced", () => {
    for (const p of ["/", "/f1", "/f1/drivers/norris", "/f1/teams/mclaren", "/f1/races/13", "/news", "/settings"]) {
      expect(runsMiddleware(p)).toBe(true);
    }
  });

  it("skips public static assets so the image optimizer can fetch them", () => {
    for (const p of [
      "/f1/drivers/2026mclarenlannor01right.webp",
      "/f1/circuits/monza.png",
      "/motogp/drivers/abc.webp",
      "/icons/icon-192x192.png",
      "/manifest.json",
      "/sw.js",
      "/next.svg",
      "/favicon.ico",
    ]) {
      expect(runsMiddleware(p)).toBe(false);
    }
  });

  it("skips API and Next internals", () => {
    for (const p of ["/api/sync/f1", "/_next/static/chunk.js", "/_next/image"]) {
      expect(runsMiddleware(p)).toBe(false);
    }
  });
});
