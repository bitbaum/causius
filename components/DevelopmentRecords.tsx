import { DevelopmentPage } from "bip-kit/react";
import "bip-kit/styles.css";
import { getTranslations } from "next-intl/server";
import { shell } from "@/components/ui";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { FLEET_PROFILE_URL, loadFleetPresence } from "@/lib/fleet";
import { ROUTES } from "@/lib/routes";

const LABELS = [
  "roadmap",
  "changelog",
  "home",
  "profile",
  "beta",
  "source",
  "unavailable",
  "emptyRoadmap",
  "emptyChangelog",
  "progress",
  "target",
] as const;

/**
 * The roadmap or the changelog, inside Causius's shell. The data is the fleet
 * map's (which ingests ROADMAP.md and CHANGELOG.md from this repository); the
 * chrome is ours. bip-kit's neutral theme is retuned to this site's tokens in
 * globals.css (`--bp-*`). When the map cannot be read, bip-kit says
 * "unavailable" rather than showing a stored copy that may have drifted.
 *
 * The labels are translated; the record text itself is the operator's own
 * words and is left as written, in English, with a line saying so.
 */
export async function DevelopmentRecords({
  section,
  locale,
}: {
  section: "roadmap" | "changelog";
  locale: Locale;
}) {
  const t = await getTranslations("Records");
  const { development } = await loadFleetPresence();
  // bip-kit renders plain anchors, so the language prefix is applied here.
  const at = (href: string) => getPathname({ href, locale });
  const note = t("englishOnly");

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      {note && <p className="mb-6 text-sm text-fg-secondary">{note}</p>}
        <DevelopmentPage
          profile={development}
          section={section}
          homeHref={at(ROUTES.home)}
          roadmapHref={at(ROUTES.roadmap)}
          changelogHref={at(ROUTES.changelog)}
          profileHref={FLEET_PROFILE_URL}
          labels={Object.fromEntries(LABELS.map((key) => [key, t(key)]))}
        />
    </main>
  );
}
