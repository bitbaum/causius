import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { SiteNav } from "@/components/SiteNav";
import { shell } from "@/components/ui";
import { loadFleetPresence } from "@/lib/fleet";
import { EXTERNAL, ROUTES } from "@/lib/routes";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Causius — understand and answer legal letters", template: "%s · Causius" },
  description:
    "Causius reads an official letter with you: what it says, what it asks for and by when. When you need a person, it hands the case to a legal assistant or a licensed lawyer.",
  metadataBase: new URL("https://causius.orangecat.ch"),
  openGraph: { siteName: "Causius", type: "website" },
};

const footerLink =
  "inline-flex min-h-11 items-center text-fg-secondary underline decoration-border-subtle underline-offset-4 hover:text-fg-primary";

/**
 * Deliberately bare: no analytics, no third-party script, no structured data
 * belonging to anyone else. Everything that renders here belongs to this site.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Which planes this product is actually on. A link is rendered only when the
  // fleet map reports the profile exists — see lib/fleet.ts.
  const { orangecatUrl, solonUrl } = await loadFleetPresence();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-border-subtle">
          <div className={`${shell} flex flex-wrap items-center justify-between gap-x-6 py-2`}>
            <Link
              href={ROUTES.home}
              className="inline-flex min-h-11 items-center gap-2.5 font-heading text-xl font-semibold tracking-display"
            >
              Causius
              {/* Fleet AGENTS.md: nothing is "Live". Served and unfinished says so. */}
              <span className="rounded-card border border-border-subtle px-1.5 py-0.5 font-mono text-[0.625rem] font-normal uppercase tracking-caps text-fg-secondary">
                Beta
              </span>
            </Link>
            <SiteNav />
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-20 border-t border-border-subtle">
          <div className={`${shell} grid gap-6 py-8 text-sm text-fg-secondary`}>
            <p className="max-w-prose">
              Beta: running, not released. Causius AI gives legal information, not legal advice. Only
              a lawyer licensed where your case is may advise you on it or represent you.
            </p>
            <nav aria-label="About Causius" className="flex flex-wrap gap-x-6">
              <Link href={ROUTES.roadmap} className={footerLink}>
                Roadmap
              </Link>
              <Link href={ROUTES.changelog} className={footerLink}>
                Changelog
              </Link>
              {orangecatUrl && (
                <a href={orangecatUrl} className={footerLink}>
                  Fund it on OrangeCat
                </a>
              )}
              {solonUrl && (
                <a href={solonUrl} className={footerLink}>
                  How it is governed, on Solon
                </a>
              )}
              <a href={EXTERNAL.repo} className={footerLink}>
                Source
              </a>
            </nav>
          </div>
        </footer>

        {/* The Loki feedback widget: the owner points at what they do not like
            and an agent changes it. Env-gated, so a local dev run and a fork
            carry no widget at all. */}
        {process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN && (
          <Script
            src="https://loki.orangecat.ch/widget.js"
            strategy="afterInteractive"
            data-fc-project={process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN}
          />
        )}
      </body>
    </html>
  );
}
