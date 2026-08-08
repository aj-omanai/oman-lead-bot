import { defineConfig } from "vitest/config";

// Standalone test config (the platform's vite.config.ts is intentionally left
// untouched). Convex functions are tested in-process via convex-test, which
// requires convex ^1.43.0 (see package.json).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30000,
  },
});
