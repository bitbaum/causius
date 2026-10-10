"use client";

import { ROUTES } from "@/lib/routes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { CaseView } from "@/components/CaseView";
import { link, shell } from "@/components/ui";
import { newId } from "@/lib/case";
import { SAMPLE_CASE } from "@/lib/sample";
import { deleteCase, saveCase, useCases, useHydrated } from "@/lib/store";

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const cases = useCases();
  const hydrated = useHydrated();

  if (id === "sample") {
    return (
      <main className={`${shell} py-10 sm:py-14`}>
        <p className="mb-8 rounded-card border border-border-subtle px-4 py-3 text-sm text-fg-secondary">
          Worked example. The person, dates and reference number are invented.
        </p>
        <CaseView
          data={SAMPLE_CASE}
          onSaveCopy={() => {
            const copy = { ...SAMPLE_CASE, id: newId(), createdAt: new Date().toISOString() };
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
          onChange={saveCase}
          onDelete={() => {
            deleteCase(data.id);
            router.push(ROUTES.cases);
          }}
        />
      ) : hydrated ? (
        <div className="py-16">
          <h1 className="font-heading text-3xl font-semibold">This case is not on this device</h1>
          <p className="mt-3 max-w-prose text-fg-secondary">
            Cases are kept in the browser they were created in. If you have the exported file, you
            can import it.
          </p>
          <p className="mt-6">
            <Link href={ROUTES.cases} className={link}>
              Go to my cases
            </Link>
          </p>
        </div>
      ) : null}
    </main>
  );
}
