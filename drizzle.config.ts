import type { Config } from "drizzle-kit";

/**
 * Migrations go to `./drizzle`, the path loki/scripts/hetzner/apply-schema.sh
 * probes for an app whose app_dir is the repo root. Anywhere else, the deploy
 * says "no drizzle dir — skipping" and ships code against missing tables.
 */
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
} satisfies Config;
