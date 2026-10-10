import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { shell } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Causius — understand and answer legal letters", template: "%s · Causius" },
  description:
    "Causius reads an official letter with you: what it says, what it asks for and by when. When you need a person, it hands the case to a legal assistant or a licensed lawyer.",
  metadataBase: new URL("https://causius.orangecat.ch"),
  openGraph: { siteName: "Causius", type: "website" },
};

const NAV = [
  { href: "/cases", label: "My cases" },
  { href: "/helpers", label: "Helpers" },
];

/**
 * Deliberately bare: no analytics, no third-party script, no structured data
 * belonging to anyone else. Everything that renders here belongs to this site.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-border-subtle">
          <div className={`${shell} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4`}>
            <Link href="/" className="font-heading text-xl font-semibold tracking-display">
              Causius
            </Link>
            <nav aria-label="Main" className="flex items-center gap-5 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-fg-secondary hover:text-fg-primary">
                  {n.label}
                </Link>
              ))}
              <Link
                href="/cases/new"
                className="rounded-card bg-accent px-3.5 py-2 font-medium text-accent-contrast hover:opacity-85"
              >
                New case
              </Link>
            </nav>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="mt-20 border-t border-border-subtle">
          <div className={`${shell} grid gap-4 py-8 text-sm text-fg-secondary sm:grid-cols-[1fr_auto]`}>
            <p className="max-w-prose">
              Causius AI gives legal information, not legal advice. Only a lawyer licensed where your
              case is may advise you on it or represent you.
            </p>
            <p className="font-mono text-xs text-fg-muted">
              <a href="https://github.com/bitbaum/causius" className="hover:text-fg-primary">
                github.com/bitbaum/causius
              </a>
            </p>
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
