"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, card, errorText, eyebrow } from "@/components/ui";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { CaseFile } from "@/lib/case";
import { API, ROUTES } from "@/lib/routes";

/**
 * The quick check's next step: the same letter, opened as a sealed matter
 * where the agent keeps the deadline and a helper can join. Signed out, it
 * goes through sign-in and comes back here, so nothing is retyped.
 */
export function OpenAsMatter({ data }: { data: CaseFile }) {
  const t = useTranslations("FromCase");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "working" | "failed">("idle");

  async function open() {
    setState("working");
    try {
      const res = await fetch(API.matterFromCase, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ case: data, locale }),
      });
      if (res.status === 401) {
        router.push(`${ROUTES.signIn}?from=${encodeURIComponent(pathname)}`);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const { id } = (await res.json()) as { id: string };
      router.push(ROUTES.matterById(id));
    } catch {
      setState("failed");
    }
  }

  return (
    <section aria-labelledby="as-matter" className={card}>
      <p className={eyebrow}>{t("eyebrow")}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-secondary">{t("body")}</p>
      <button
        id="as-matter"
        type="button"
        className={`${btnPrimary} mt-4 w-full`}
        disabled={state === "working"}
        onClick={open}
      >
        {state === "working" ? t("working") : t("open")}
      </button>
      {state === "failed" && (
        <p role="alert" className={`${errorText} mt-2`}>
          {t("failed")}
        </p>
      )}
    </section>
  );
}
