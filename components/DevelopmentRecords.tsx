import { DevelopmentPage } from "bip-kit/react";
import "bip-kit/styles.css";
import { shell } from "@/components/ui";
import { FLEET_PROFILE_URL, loadFleetPresence } from "@/lib/fleet";
import { ROUTES } from "@/lib/routes";

/**
 * The roadmap or the changelog, inside Causius's shell. The data is the fleet
 * map's (which ingests ROADMAP.md and CHANGELOG.md from this repository); the
 * chrome is ours. bip-kit's neutral theme is retuned to this site's tokens in
 * globals.css (`--bp-*`). When the map cannot be read, bip-kit says
 * "unavailable" rather than showing a stored copy that may have drifted.
 */
export async function DevelopmentRecords({ section }: { section: "roadmap" | "changelog" }) {
  const { development } = await loadFleetPresence();
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <DevelopmentPage
        profile={development}
        section={section}
        homeHref={ROUTES.home}
        roadmapHref={ROUTES.roadmap}
        changelogHref={ROUTES.changelog}
        profileHref={FLEET_PROFILE_URL}
      />
    </main>
  );
}
