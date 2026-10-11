"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, btnQuiet, card, link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { daysUntil, formatDate, parseCase } from "@/lib/case";
import { ROUTES } from "@/lib/routes";
import { saveCase, useCases, useHydrated, useToday } from "@/lib/store";

export default function CasesPage() {
  const t = useTranslations("Cases");
  const locale = useLocale();
  const cases = useCases();
  const hydrated = useHydrated();
  const today = useToday();
  const router = useRouter();
  const [error, setError] = useState(false);

  async function onImport(file: File | undefined) {
    if (!file) return;
    setError(false);
    try {
      const parsed = parseCase(JSON.parse(await file.text()));
      if (!parsed) throw new Error("not a case");
      saveCase(parsed);
      router.push(ROUTES.caseById(parsed.id));
    } catch {
      setError(true);
    }
  }

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-display">{t("title")}</h1>
          <p className="mt-2 text-sm text-fg-secondary">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className={`${btnQuiet} cursor-pointer focus-within:outline-2`}>
            {t("import")}
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void onImport(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <Link href={ROUTES.newCase} className={btnPrimary}>
            {t("new")}
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-accent-fg">
          {t("importError")}
        </p>
      )}

      {hydrated && cases.length === 0 && (
        <div className={`${card} mt-10 sm:p-8`}>
          <h2 className="font-heading text-2xl font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-prose text-fg-secondary">{t("emptyBody")}</p>
          <p className="mt-3">
            <Link href={ROUTES.sampleCase} className={`${link} inline-flex min-h-11 items-center`}>
              {t("example")}
            </Link>
          </p>
        </div>
      )}

      <ul className="mt-10 grid gap-3">
        {cases.map((c) => {
          const days = c.deadline && today ? daysUntil(c.deadline, today) : null;
          const done = c.asks.filter((a) => a.done).length;
          const origin = [c.authority, c.jurisdiction].filter(Boolean).join(" · ");
          return (
            <li key={c.id}>
              <Link
                href={ROUTES.caseById(c.id)}
                className={`${card} grid gap-2 transition-colors hover:border-fg-muted sm:grid-cols-[1fr_auto] sm:items-center`}
              >
                <span>
                  <span className="block font-heading text-xl font-semibold">{c.title}</span>
                  {origin && <span className="mt-1 block text-sm text-fg-secondary">{origin}</span>}
                </span>
                <span className="text-sm sm:text-right">
                  {c.deadline && (
                    <span className={`block ${days !== null && days <= 7 ? "text-accent-fg" : ""}`}>
                      {t("replyBy", { date: formatDate(c.deadline, locale) })}
                    </span>
                  )}
                  {c.asks.length > 0 && (
                    <span className="block font-mono text-xs text-fg-secondary">
                      {t("ready", { done, total: c.asks.length })}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
