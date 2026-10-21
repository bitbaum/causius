"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { btnQuiet, card, link } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import type { EngagementView } from "@/lib/helpers/engagements";
import type { MatterView } from "@/lib/matters/store";
import { API, ROUTES } from "@/lib/routes";
import { workflowById } from "@/lib/workflows";

/**
 * Who works on this matter besides the owner and Causius. The owner finds and
 * asks helpers, sees a lawyer's checked name, and ends anyone's access in one
 * press; a helper sees how they take part and can leave.
 */
export function MatterHelpers({ matter, me, onChange }: { matter: MatterView; me: string | null; onChange: () => Promise<void> }) {
  const t = useTranslations("MatterHelpers");
  const p = useTranslations("Professions");
  const router = useRouter();
  const [list, setList] = useState<EngagementView[]>([]);

  // Re-read when the matter changes or after an action here.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let stale = false;
    fetch(API.matterEngagements(matter.id))
      .then((r) => (r.ok ? (r.json() as Promise<{ engagements: EngagementView[] }>) : null))
      .then((body) => body && !stale && setList(body.engagements))
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [matter.id, matter.updatedAt, tick]);
  const refresh = () => setTick((n) => n + 1);

  async function end(e: EngagementView) {
    await fetch(API.matterEngagement(matter.id, e.id), { method: "DELETE" });
    refresh();
    await onChange();
  }

  async function leave() {
    const r = await fetch(API.matterLeave(matter.id), { method: "POST" });
    if (r.ok) router.push(ROUTES.helperDesk);
  }

  const shown = list.filter((e) => e.status === "requested" || e.status === "accepted");
  const self = matter.participants.find((x) => x.sub === me);

  return (
    <section className={`${card} grid gap-3`}>
      <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
      {matter.role === "helper" && (
        <div className="grid gap-2 text-sm">
          <p>{t("youHelp", { alias: self?.alias ?? "" })}</p>
          {matter.sees === "anonymised" && <p className="text-fg-secondary">{t("youSeeAnonymised")}</p>}
          <p>
            <button type="button" className={btnQuiet} onClick={leave}>
              {t("leave")}
            </button>
          </p>
        </div>
      )}
      {matter.role === "owner" && shown.length === 0 && <p className="text-sm text-fg-secondary">{t("none")}</p>}
      <ul className="grid gap-3">
        {shown.map((e) => (
          <li key={e.id} className="grid gap-1 text-sm">
            <span className="kicker">
              {p(`kinds.${e.helper.kind}.name`)} · {t(`status.${e.status}`)}
            </span>
            <Link href={ROUTES.helperById(e.helper.id)} className={`${link} font-medium`}>
              {e.helper.name}
            </Link>
            <span className="text-xs text-fg-secondary">{t(`sees.${e.sees}`)}</span>
            {e.disclosure && (
              <span className={e.disclosure.verified.every((v) => v.ok) ? "text-status-positive" : "text-accent"}>
                {e.disclosure.verified.every((v) => v.ok) ? t("verifiedName", { name: e.disclosure.legalName }) : t("nameMismatch")}
              </span>
            )}
            {e.disclosure?.attestations[0] && (
              <Link
                href={{ pathname: ROUTES.verify, query: { token: `${e.disclosure.attestations[0].token}${e.disclosure.attestations[0].disclosures.join("~")}~` } }}
                className={`${link} text-xs`}
              >
                {t("checkYourself")}
              </Link>
            )}
            {matter.role === "owner" && (
              <span>
                <button type="button" className={btnQuiet} onClick={() => end(e)}>
                  {e.status === "requested" ? t("withdraw") : t("end")}
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {matter.role === "owner" && (
        <p>
          <Link href={{ pathname: ROUTES.helpers, query: { from: matter.id, ...(workflowById(matter.core.workflow) ? { area: workflowById(matter.core.workflow)!.area } : {}) } }} className={link}>
            {t("find")}
          </Link>
        </p>
      )}
    </section>
  );
}
