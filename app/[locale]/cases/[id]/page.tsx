"use client";

import { useLocale, useTranslations } from "next-intl";
import { use } from "react";
import { CaseView } from "@/components/CaseView";
import { OpenAsMatter } from "@/components/matters/OpenAsMatter";
import { link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { newId } from "@/lib/case";
import { ROUTES } from "@/lib/routes";
import { sampleCase } from "@/lib/sample";
import { deleteCase, saveCase, useCases, useHydrated } from "@/lib/store";

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("Case");
  const locale = toLocale(useLocale());
  const router = useRouter();
  const cases = useCases();
  const hydrated = useHydrated();

  if (id === "sample") {
    const sample = sampleCase(locale);
    return (
      <main className={`${shell} py-10 sm:py-14`}>
        <p className="mb-8 rounded-control border border-border-subtle px-4 py-3 text-sm text-fg-secondary">
          {t("sampleBanner")}
        </p>
        <CaseView
          data={sample}
          onSaveCopy={() => {
            const copy = { ...sample, id: newId(), createdAt: new Date().toISOString() };
            saveCase(copy);
            router.push(ROUTES.caseById(copy.id));
          }}
        />
      </main>
    );
  }

  const data = cases.find((c) => c.id === id);
  return (
    <main className={`${shell} py-10 sm:py-14`}>
      {data ? (
        <CaseView
          data={data}
          next={<OpenAsMatter data={data} />}
          onChange={saveCase}
          onDelete={() => {
            deleteCase(data.id);
            router.push(ROUTES.cases);
          }}
        />
      ) : hydrated ? (
        <div className="py-16">
          <h1 className="text-3xl font-semibold tracking-tight">{t("notHereTitle")}</h1>
          <p className="mt-3 max-w-prose text-fg-secondary">{t("notHereBody")}</p>
          <p className="mt-4">
            <Link href={ROUTES.cases} className={`${link} inline-flex min-h-11 items-center`}>
              {t("goCases")}
            </Link>
          </p>
        </div>
      ) : null}
    </main>
  );
}
