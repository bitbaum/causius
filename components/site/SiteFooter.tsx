import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FLEET_SLUG, loadFleetPresence } from "@/lib/fleet";
import { EXTERNAL, ROUTES } from "@/lib/routes";
import { Logo } from "./Logo";

/** Every page on the site, one scroll away. The header carries four. */
const SECTIONS = [
  {
    key: "product",
    links: [
      { key: "matters", href: ROUTES.matters },
      { key: "quick", href: ROUTES.newCase },
      { key: "helpers", href: ROUTES.helpers },
      { key: "settings", href: ROUTES.settings },
    ],
  },
  {
    key: "platform",
    links: [
      { key: "platform", href: ROUTES.platform },
      { key: "security", href: ROUTES.security },
      { key: "ecosystem", href: ROUTES.ecosystem },
    ],
  },
  {
    key: "open",
    links: [
      { key: "roadmap", href: ROUTES.roadmap },
      { key: "changelog", href: ROUTES.changelog },
    ],
  },
] as const;

const linkClass = "inline-flex min-h-11 min-w-11 items-center transition-colors hover:text-fg-primary";

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  // The sibling products, from the fleet map: a footer that typed them would
  // be a copy of the portfolio. And whether Causius has its own OrangeCat
  // profile and Solon organisation: linked only when the map reports one.
  const { pillars, orangecatUrl, solonUrl } = await loadFleetPresence();
  const siblings = pillars.filter((p) => p.slug !== FLEET_SLUG && p.url);

  return (
    <footer className="mt-24 border-t border-border-subtle bg-surface-public">
      <div className="section-shell py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" />
            <p className="mt-4 max-w-xs text-sm text-fg-secondary">{t("tagline")}</p>
          </div>
          {SECTIONS.map((section) => (
            <div key={section.key}>
              <div className="kicker">{t(`sections.${section.key}`)}</div>
              <ul className="mt-3 text-sm text-fg-secondary">
                {section.links.map((l) => (
                  <li key={l.key}>
                    <Link href={l.href} className={linkClass}>
                      {t(`links.${l.key}`)}
                    </Link>
                  </li>
                ))}
                {section.key === "open" && (
                  <>
                    <li>
                      <a href={EXTERNAL.repo} className={linkClass}>
                        {t("links.source")}
                      </a>
                    </li>
                    <li>
                      <a href={EXTERNAL.license} className={linkClass}>
                        {t("links.license")}
                      </a>
                    </li>
                    {orangecatUrl && (
                      <li>
                        <a href={orangecatUrl} className={linkClass}>
                          {t("links.orangecat")}
                        </a>
                      </li>
                    )}
                    {solonUrl && (
                      <li>
                        <a href={solonUrl} className={linkClass}>
                          {t("links.solon")}
                        </a>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-14 max-w-copy text-sm text-fg-secondary">{t("disclaimer")}</p>

        <div className="mt-8 flex flex-col gap-3 border-t border-border-subtle pt-6 text-xs text-fg-tertiary sm:flex-row sm:items-center sm:justify-between">
          <div>{t("openSource")}</div>
          {siblings.length > 0 && (
            <ul aria-label={t("fleet")} className="flex flex-wrap gap-x-6">
              {siblings.map((p) => (
                <li key={p.slug}>
                  <a
                    href={p.url!}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center px-2 transition-colors hover:text-fg-primary"
                  >
                    {p.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
