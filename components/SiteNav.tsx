"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { localeNames, locales } from "@/i18n/routing";
import { ROUTES } from "@/lib/routes";

const NAV = [
  { href: ROUTES.cases, key: "cases" },
  { href: ROUTES.helpers, key: "helpers" },
  { href: ROUTES.settings, key: "settings" },
] as const;

/**
 * The main nav and the language switcher. Fleet nav contract: the active link
 * carries `aria-current` (rule 1), every target is at least 44px (rule 3), the
 * label is inside the control (rule 4) and every href comes from the routes
 * constant (rule 6).
 */
export function SiteNav() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  // Without the language prefix, so it compares against the routes constant.
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // "New case" lives under /cases, so it wins over "My cases" when both match.
  const onNewCase = pathname === ROUTES.newCase;

  return (
    <div className="flex flex-wrap items-center gap-x-4">
      <nav aria-label={t("main")} className="flex flex-wrap items-center gap-x-1 text-sm">
        {NAV.map((n) => {
          const current = isCurrent(n.href) && !(onNewCase && n.href === ROUTES.cases);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={current ? "page" : undefined}
              className="inline-flex min-h-11 min-w-11 items-center px-2.5 text-fg-secondary hover:text-fg-primary aria-[current=page]:text-fg-primary aria-[current=page]:underline aria-[current=page]:decoration-accent-fg aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {t(n.key)}
            </Link>
          );
        })}
        <Link
          href={ROUTES.newCase}
          aria-current={onNewCase ? "page" : undefined}
          className="ml-1.5 inline-flex min-h-11 items-center rounded-card bg-accent px-4 font-medium text-accent-contrast hover:opacity-85"
        >
          {t("newCase")}
        </Link>
      </nav>

      {/* Plain links, so the language changes with JavaScript off and a
          reader can open another language in a new tab. */}
      <nav aria-label={t("language")} className="flex items-center text-sm">
        {locales.map((l) => (
          <Link
            key={l}
            href={pathname}
            locale={l}
            lang={l}
            hrefLang={l}
            aria-current={l === locale ? "true" : undefined}
            title={localeNames[l]}
            className="inline-flex min-h-11 min-w-11 items-center justify-center font-mono text-xs uppercase tracking-caps text-fg-secondary hover:text-fg-primary aria-[current=true]:font-semibold aria-[current=true]:text-fg-primary aria-[current=true]:underline aria-[current=true]:decoration-accent-fg aria-[current=true]:decoration-2 aria-[current=true]:underline-offset-8"
          >
            <span aria-hidden="true">{l}</span>
            <span className="sr-only">{localeNames[l]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
