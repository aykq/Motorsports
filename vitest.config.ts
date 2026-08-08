import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import path from "path";

loadEnv({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    // Test files share one Postgres test instance and reset shared tables
    // via delete-based fixtures — running files in parallel would let them
    // stomp on each other's rows.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
