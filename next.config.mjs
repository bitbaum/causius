import createNextIntlPlugin from "next-intl/plugin";

// Points next-intl at the request config that picks each request's language.
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The box's launch.sh looks for a server.js — see sync-infra.sh.
  output: "standalone",
  reactStrictMode: true,
};
export default withNextIntl(nextConfig);
