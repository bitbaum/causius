"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnQuiet, card, link, shell } from "@/components/ui";
import { daysUntil, formatDate, parseCase } from "@/lib/case";
import { saveCase, useCases, useHydrated, useToday } from "@/lib/store";

export default function CasesPage() {
  const cases = useCases();
  const hydrated = useHydrated();
  const today = useToday();
  const router = useRouter();
  const [error, setError] = useState("");

  async function onImport(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const parsed = parseCase(JSON.parse(await file.text()));
      if (!parsed) throw new Error("not a case");
      saveCase(parsed);
      router.push(`/cases/${parsed.id}`);
    } catch {
      setError("That file is not a Causius case file.");
    }
  }

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold tracking-display">My cases</h1>
          <p className="mt-2 text-sm text-fg-secondary">Kept in this browser, on this device.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className={`${btnQuiet} cursor-pointer`}>
            Import case file
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
          <Link href="/cases/new" className={btnPrimary}>
            New case
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-sm text-accent-fg">
          {error}
        </p>
      )}

      {hydrated && cases.length === 0 && (
        <div className={`${card} mt-10 sm:p-8`}>
          <h2 className="font-heading text-2xl font-semibold">No cases yet</h2>
          <p className="mt-2 max-w-prose text-fg-secondary">
            Start with a letter you need to answer, or look at a worked example first.
          </p>
          <p className="mt-5">
            <Link href="/cases/sample" className={link}>
              See the worked example
            </Link>
          </p>
        </div>
      )}

      <ul className="mt-10 grid gap-3">
        {cases.map((c) => {
          const days = c.deadline && today ? daysUntil(c.deadline, today) : null;
          const done = c.asks.filter((a) => a.done).length;
          return (
            <li key={c.id}>
              <Link
                href={`/cases/${c.id}`}
                className={`${card} grid gap-2 transition-colors hover:border-fg-muted sm:grid-cols-[1fr_auto] sm:items-center`}
              >
                <span>
                  <span className="block font-heading text-xl font-semibold">{c.title}</span>
                  <span className="mt-1 block text-sm text-fg-secondary">
                    {c.authority} · {c.jurisdiction}
                  </span>
                </span>
                <span className="text-sm sm:text-right">
                  {c.deadline && (
                    <span className={`block ${days !== null && days <= 7 ? "text-accent-fg" : ""}`}>
                      Reply by {formatDate(c.deadline)}
                    </span>
                  )}
                  {c.asks.length > 0 && (
                    <span className="block font-mono text-xs text-fg-muted">
                      {done} of {c.asks.length} ready
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
