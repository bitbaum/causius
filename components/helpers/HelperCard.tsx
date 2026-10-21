import { useLocale, useTranslations } from "next-intl";
import { card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { PublicHelper } from "@/lib/helpers/store";
import { ROUTES } from "@/lib/routes";
import { languageList, placeList } from "./labels";

/** One helper in the directory: what they are, where, in which languages, and what was checked. */
export function HelperCard({ helper, matter }: { helper: PublicHelper; matter?: string }) {
  const t = useTranslations("Helpers");
  const p = useTranslations("Professions");
  const locale = useLocale();
  const checked = [...new Set(helper.attestations.map((a) => a.jurisdiction))];
  return (
    <Link
      href={{ pathname: ROUTES.helperById(helper.id), query: matter ? { matter } : {} }}
      className={`${card} grid gap-2 transition-colors hover:border-fg-muted`}
    >
      <span className="kicker">{p(`kinds.${helper.kind}.name`)}</span>
      <span className="text-xl font-semibold tracking-tight">{helper.name}</span>
      {helper.headline && <span className="text-sm text-fg-secondary">{helper.headline}</span>}
      <span className="text-sm">
        {placeList(helper.jurisdictions, locale)}
        {helper.languages.length > 0 && (
          <span className="text-fg-secondary"> — {languageList(helper.languages, locale)}</span>
        )}
      </span>
      {checked.length > 0 ? (
        <span className="font-mono text-xs text-status-positive">
          {t("verifiedIn", { places: placeList(checked, locale) })}
        </span>
      ) : (
        <span className="text-xs text-fg-tertiary">{p(`kinds.${helper.kind}.does`)}</span>
      )}
    </Link>
  );
}
