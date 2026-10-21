"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { btnQuiet } from "@/components/ui";
import type { OwnHelper } from "@/lib/helpers/store";
import { PROFESSIONS } from "@/lib/professions";
import { API } from "@/lib/routes";
import { call, errorKey } from "./api";
import { CredentialPanel } from "./CredentialPanel";
import { ProfileForm } from "./ProfileForm";
import { RequestList } from "./RequestList";

/** The helper's own page: their public profile, their admission if they need one, and what people asked. */
export function HelperDesk() {
  const t = useTranslations("HelperDesk");
  const [helper, setHelper] = useState<OwnHelper | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    call<{ helper: OwnHelper | null }>(API.helper).then((r) => {
      if (stale) return;
      if (r.ok) setHelper(r.data.helper);
      else setError(r.error);
    });
    return () => {
      stale = true;
    };
  }, []);

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    const r = await call(API.helper, { method: "DELETE" });
    if (r.ok) setHelper(null);
    else setError(r.error);
  }

  if (error)
    return (
      <p role="alert" className="text-accent">
        {t(errorKey(error))}
      </p>
    );
  if (helper === undefined) return null;

  const needs = helper && PROFESSIONS[helper.kind].requires;
  return (
    <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
      <section className="grid content-start gap-4">
        {/* Keyed on the id so a deleted profile starts a fresh form. */}
        <ProfileForm key={helper?.id ?? "new"} helper={helper} onSaved={setHelper} />
        {helper && (
          <p>
            <button type="button" onClick={remove} className={btnQuiet}>
              {t("delete")}
            </button>
          </p>
        )}
      </section>
      <div className="grid content-start gap-12">
        {needs && (
          <section className="grid gap-4">
            <h2 className="headline text-2xl">{t("credential.title")}</h2>
            <CredentialPanel helper={helper} onChanged={setHelper} />
          </section>
        )}
        {helper && (
          <section className="grid gap-4">
            <h2 className="headline text-2xl">{t("requests.title")}</h2>
            <RequestList />
          </section>
        )}
      </div>
    </div>
  );
}
