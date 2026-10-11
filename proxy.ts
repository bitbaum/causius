import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Puts every page request in a language: `/de/cases` renders German, `/cases`
 * English. API routes, Next's own files and static assets are never touched.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
