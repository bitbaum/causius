import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ESLint 9 flat config, matching what the rest of the fleet's Next 16 apps use.
// Without a config file `eslint` exits non-zero with a migration notice, which
// would make a brand new site's first CI run red for reasons unrelated to its
// code — and a red first run is how a team learns to ignore CI.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // ESLint 10 removed the legacy `context.getFilename()` that
    // eslint-plugin-react's version-`detect` codepath still calls. Pin an
    // explicit React version so `detect` never runs. Same fix as Solon and
    // Loki; keep the number in step with `react` in package.json.
    settings: { react: { version: "19.2.4" } },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
