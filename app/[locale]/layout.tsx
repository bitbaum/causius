import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing, toLocale } from "@/i18n/routing";
import { loadFleetPresence } from "@/lib/fleet";
import { EXTERNAL, ROUTES } from "@/lib/routes";
import "../globals.css";

const SITE_URL = "https://causius.orangecat.ch";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: "%s · Causius" },
    description: t("description"),
    openGraph: { siteName: "Causius", type: "website", description: t("description") },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`]),
      ),
    },
  };
}

const footerLink =
  "inline-flex min-h-11 items-center text-fg-secondary underline decoration-border-subtle underline-offset-4 hover:text-fg-primary";

/**
 * Deliberately bare: no analytics, no third-party script, no structured data
 * belonging to anyone else. Everything that renders here belongs to this site.
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
  const t = await getTranslations("Footer");

  // Which planes this product is actually on. A link is rendered only when the
  // fleet map reports the profile exists — see lib/fleet.ts.
  const { orangecatUrl, solonUrl } = await loadFleetPresence();

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <header className="border-b border-border-subtle">
            <div className={`${shell} flex flex-wrap items-center justify-between gap-x-6 py-2`}>
              <Link
                href={ROUTES.home}
                className="inline-flex min-h-11 items-center gap-2.5 font-heading text-xl font-semibold tracking-display"
              >
                Causius
                {/* Fleet AGENTS.md: nothing is "Live". Served and unfinished says so. */}
                <span className="rounded-card border border-border-subtle px-1.5 py-0.5 font-mono text-[0.625rem] font-normal uppercase tracking-caps text-fg-secondary">
                  {nav("beta")}
                </span>
              </Link>
              <SiteNav />
            </div>
          </header>

          <div className="flex-1">{children}</div>

          <footer className="mt-20 border-t border-border-subtle">
            <div className={`${shell} grid gap-6 py-8 text-sm text-fg-secondary`}>
              <p className="max-w-prose">{t("disclaimer")}</p>
              <nav aria-label={t("about")} className="flex flex-wrap gap-x-6">
                <Link href={ROUTES.roadmap} className={footerLink}>
                  {t("roadmap")}
                </Link>
                <Link href={ROUTES.changelog} className={footerLink}>
                  {t("changelog")}
                </Link>
                {orangecatUrl && (
                  <a href={orangecatUrl} className={footerLink}>
                    {t("orangecat")}
                  </a>
                )}
                {solonUrl && (
                  <a href={solonUrl} className={footerLink}>
                    {t("solon")}
                  </a>
                )}
                <a href={EXTERNAL.repo} className={footerLink}>
                  {t("source")}
                </a>
              </nav>
            </div>
          </footer>
        </NextIntlClientProvider>

        {/* The Loki feedback widget: the owner points at what they do not like
            and an agent changes it. Env-gated, so a local dev run and a fork
            carry no widget at all. */}
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
