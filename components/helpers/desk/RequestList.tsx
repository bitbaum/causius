"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { btnPrimary, btnQuiet, card, link } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/case";
import type { HelperRequestView } from "@/lib/helpers/engagements";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { API, ROUTES } from "@/lib/routes";
import { call, errorKey } from "./api";

/** What people asked this helper for. Accepting opens the matter, as the owner chose to share it. */
export function RequestList() {
  const t = useTranslations("HelperDesk");
  const locale = useLocale();
  const router = useRouter();
  const [list, setList] = useState<HelperRequestView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    call<{ requests: HelperRequestView[] }>(API.helperRequests).then((r) => {
      if (stale) return;
      if (r.ok) setList(r.data.requests);
      else setError(r.error);
    });
    return () => {
      stale = true;
    };
  }, []);

  async function answer(req: HelperRequestView, a: "accept" | "decline") {
    setError(null);
    const r = await call<{ matterId: string }>(API.helperRequest(req.id), { method: "POST", body: { answer: a } });
    if (!r.ok) return setError(r.error);
    if (a === "accept") router.push(ROUTES.matterById(r.data.matterId));
    else setList((l) => l?.filter((x) => x.id !== req.id) ?? l);
  }

  if (list === null && !error) return null;
  return (
    <div className="grid gap-3">
      {error && (
        <p role="alert" className="text-sm text-accent">
          {t(errorKey(error))}
        </p>
      )}
      {list?.length === 0 && <p className="text-fg-secondary">{t("requests.none")}</p>}
      {list?.map((r) => (
        <article key={r.id} className={`${card} grid gap-2`}>
          <p className="kicker">
            {formatDate(r.createdAt.slice(0, 10), locale)}
            {r.request.jurisdiction && ` · ${jurisdictionLabel(r.request.jurisdiction, locale)}`}
            {` · ${t(`requests.${r.sees}`)}`}
          </p>
          <h3 className="text-lg font-semibold tracking-tight">{r.request.title}</h3>
          <p className="whitespace-pre-line text-sm">{r.request.message}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {r.status === "requested" ? (
              <>
                <button type="button" className={btnPrimary} onClick={() => answer(r, "accept")}>
                  {t("requests.accept")}
                </button>
                <button type="button" className={btnQuiet} onClick={() => answer(r, "decline")}>
                  {t("requests.decline")}
                </button>
              </>
            ) : (
              <>
                <span className="text-sm text-fg-secondary">{t("requests.accepted")}</span>
                <Link href={ROUTES.matterById(r.matterId)} className={link}>
                  {t("requests.open")}
                </Link>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
