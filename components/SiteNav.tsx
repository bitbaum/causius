"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { localeNames, locales } from "@/i18n/routing";
import { ROUTES } from "@/lib/routes";

/** The places in the header. Everything else is one scroll away, in the footer. */
const NAV = [
  { href: ROUTES.matters, key: "matters" },
  { href: ROUTES.platform, key: "platform" },
  { href: ROUTES.security, key: "security" },
  { href: ROUTES.ecosystem, key: "ecosystem" },
] as const;

const item =
  "inline-flex min-h-11 items-center px-3 text-sm font-semibold text-fg-secondary transition-colors hover:text-fg-primary aria-[current=page]:text-fg-primary aria-[current=page]:underline aria-[current=page]:decoration-accent aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8";

/**
 * The main nav and the language switcher. Fleet nav contract: the active link
 * carries `aria-current`, every target is at least 44px, and every href comes
 * from the routes constant. On a phone the same links fold into a menu.
 */
export function SiteNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // A tap on a link in the folded menu navigates; close the menu behind it.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [pathname]);

  const links = NAV.map((n) => (
    <Link key={n.href} href={n.href} aria-current={isCurrent(n.href) ? "page" : undefined} className={item}>
      {t(n.key)}
    </Link>
  ));

  return (
    <>
      <nav aria-label={t("main")} className="hidden items-center lg:flex">
        {links}
      </nav>
      <div className="flex items-center gap-1">
        <div className="hidden sm:block">
          <Languages />
        </div>
        <details ref={menu} className="relative lg:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center px-3 text-sm font-semibold text-fg-primary [&::-webkit-details-marker]:hidden">
            {t("menu")}
          </summary>
          <nav
            aria-label={t("main")}
            className="absolute right-0 top-full z-50 mt-2 grid min-w-56 border border-border bg-surface-overlay p-2"
          >
            {links}
            <Link href={ROUTES.newCase} className={item}>
              {t("quick")}
            </Link>
            <div className="mt-2 border-t border-border-subtle pt-2 sm:hidden">
              <Languages />
            </div>
          </nav>
        </details>
      </div>
    </>
  );
}

/**
 * Plain links, so the language changes with JavaScript off and a reader can
 * open another language in a new tab.
 */
function Languages() {
  const t = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav aria-label={t("language")} className="flex items-center">
      {locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          lang={l}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          title={localeNames[l]}
          className="inline-flex min-h-11 min-w-9 items-center justify-center font-mono text-xs uppercase text-fg-tertiary transition-colors hover:text-fg-primary aria-[current=true]:text-fg-primary"
        >
          <span aria-hidden="true">{l}</span>
          <span className="sr-only">{localeNames[l]}</span>
        </Link>
      ))}
    </nav>
  );
}
