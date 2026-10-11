import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { SECURITY_HEADERS } from "./lib/security";

// Points next-intl at the request config that picks each request's language.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // The box's launch.sh looks for a server.js — see sync-infra.sh.
  output: "standalone",
  reactStrictMode: true,
  // Nothing to gain from telling the internet which framework this is.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Answers about a reader's letter or key must never sit in a cache.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default withNextIntl(nextConfig);
