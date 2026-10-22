import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "i18n/**/*.test.ts"],
    testTimeout: 20000,
    // A fresh PGlite per file boots in a few seconds, but a cold machine
    // starting every file at once took past the 10 s default and failed
    // whole files without running a test.
    hookTimeout: 30000,
  },
});
