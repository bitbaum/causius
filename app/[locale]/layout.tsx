// The design SSOT for OrangeCat, Loki and Solon: tokens and the self-hosted
// faces they name. It loads before globals.css so the app's few shapes build on it.
import "@bitbaum/design-tokens/tokens.css";
// The account menu and the sign-in error screen are drawn by this sheet.
import "@bitbaum/accountkit/styles.css";
import "../globals.css";
// The look: the one file that decides it. After the tokens it overrides.
import "../theme.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountControl } from "@/components/AccountControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Logo } from "@/components/site/Logo";
import { SiteNav } from "@/components/SiteNav";
import { Link } from "@/i18n/navigation";
import { routing, toLocale } from "@/i18n/routing";
import { auth, authEnabled } from "@/lib/auth";
import { signOutOfCausius } from "@/lib/auth/actions";
import { entryHref } from "@/lib/auth/entry";
import { FLEET_SLUG, loadFleetPresence } from "@/lib/fleet";
import { ROUTES } from "@/lib/routes";
import { THEME_BOOT } from "@/lib/theme";

const SITE_URL = "https://causius.orangecat.ch";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s · Causius" },
    description: t("description"),
    openGraph: { siteName: "Causius", type: "website", description: t("description") },
    alternates: { languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])) },
  };
}

/**
 * The frame every page shares: the fleet's tokens wearing Causius's own look
 * (app/theme.css), light by default and dark on request, a header with the product's places and the one account,
 * and a footer that holds the rest of the site.
 *
 * Deliberately bare otherwise: no analytics, no third-party script.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Set by proxy.ts. Reading it makes every page render per request, which is
  // what a nonce needs: a nonce baked into a static page is no nonce at all.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const nav = await getTranslations("Nav");
  const [{ pillars }, session] = await Promise.all([loadFleetPresence(), auth()]);
  const fleet = pillars
    .filter((p) => p.slug !== FLEET_SLUG && p.url)
    .map((p) => ({ slug: p.slug, name: p.name, url: p.url! }));

  return (
    // The class is set before paint by THEME_BOOT, so React must not insist on
    // the server's. Light is the default; dark follows the device or the toggle.
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface-overlay focus:px-4 focus:py-2"
          >
            {nav("skip")}
          </a>
          <header className="header-solid sticky top-0 z-40 border-b border-border-subtle">
            <div className="section-shell flex min-h-16 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <Link href={ROUTES.home} className="inline-flex min-h-11 items-center" aria-label="Causius">
                  <Logo />
                </Link>
                {/* Fleet AGENTS.md: nothing is "Live". Served and unfinished says so. */}
                <span className="hidden rounded-control border border-border px-1.5 sm:inline py-0.5 font-mono text-[0.625rem] uppercase tracking-caps text-fg-secondary">
                  {nav("beta")}
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <SiteNav />
                <ThemeToggle />
                {authEnabled && (
                  <AccountControl
                    user={session?.actorId ? { name: session.user?.name } : null}
                    signInHref={entryHref("sign-in", locale, ROUTES.matters)}
                    signOutAction={signOutOfCausius.bind(null, locale)}
                    fleet={fleet}
                  />
                )}
              </div>
            </div>
          </header>

          <div id="main" className="flex-1">
            {children}
          </div>

          <SiteFooter />
        </NextIntlClientProvider>

        {/* The Loki feedback widget: the owner points at what they do not like
            and an agent changes it. Env-gated, so a local run and a fork carry
            no widget at all. */}
        {process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN && (
          <Script
            src="https://loki.orangecat.ch/widget.js"
            strategy="afterInteractive"
            nonce={nonce}
            data-fc-project={process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN}
          />
        )}
      </body>
    </html>
  );
}
