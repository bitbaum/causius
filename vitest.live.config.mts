import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Only for `pnpm run check:analyze`. Needs a vendor key and the network. */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { environment: "node", include: ["live/**/*.live.ts"], fileParallelism: false },
});
