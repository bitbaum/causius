"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, btnQuiet, field, label as labelClass } from "@/components/ui";
import { formatDate } from "@/lib/case";
import type { OwnHelper } from "@/lib/helpers/store";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { API } from "@/lib/routes";
import { call, errorKey } from "./api";
import { PlacePicker } from "./PlacePicker";

const EMPTY = { jurisdiction: "CH", legalName: "", registerNumber: "", registerUrl: "", note: "" };

/**
 * A lawyer's admission, submitted for checking. What is typed here is sealed
 * on arrival and read only by the reviewer deciding it; the public gets a
 * signed statement naming the place, never the person.
 */
export function CredentialPanel({ helper, onChanged }: { helper: OwnHelper; onChanged: (h: OwnHelper) => void }) {
  const t = useTranslations("HelperDesk");
  const locale = useLocale();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await call<{ helper: OwnHelper }>(API.helperCredentials, { method: "POST", body: form });
    setBusy(false);
    if (r.ok) {
      onChanged(r.data.helper);
      setForm(EMPTY);
    } else setError(r.error);
  }

  async function withdraw(id: string) {
    const r = await call<{ helper: OwnHelper }>(API.helperCredential(id), { method: "DELETE" });
    if (r.ok) onChanged(r.data.helper);
    else setError(r.error);
  }

  const input = (key: keyof typeof EMPTY, type = "text", required = true) => (
    <label className="grid gap-1">
      <span className={labelClass}>{t(`credential.${key}`)}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className={field}
        required={required}
        {...(type === "url" ? { pattern: "https://.*" } : {})}
      />
    </label>
  );

  return (
    <div className="grid gap-5">
      <p className="text-sm text-fg-secondary">{t("credential.lead")}</p>
      {helper.credentials.length > 0 && (
        <ul className="grid gap-2">
          {helper.credentials.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-2">
              <span>
                <span className="font-medium">{jurisdictionLabel(c.jurisdiction, locale)}</span>
                <span className={`ml-3 text-sm ${c.status === "verified" ? "text-status-positive" : "text-fg-secondary"}`}>
                  {t(`credential.status.${c.status}`)}
                  {c.status === "verified" && c.expiresAt && ` · ${formatDate(c.expiresAt.slice(0, 10), locale)}`}
                </span>
                {c.reviewNote && c.status === "rejected" && (
                  <span className="block text-sm text-fg-secondary">{t("credential.reason", { note: c.reviewNote })}</span>
                )}
              </span>
              {(c.status === "pending" || c.status === "verified") && (
                <button type="button" className={btnQuiet} onClick={() => withdraw(c.id)}>
                  {t("credential.withdraw")}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid gap-4">
        <PlacePicker single label={t("credential.place")} value={[form.jurisdiction]} onChange={([v]) => setForm((f) => ({ ...f, jurisdiction: v ?? "CH" }))} />
        {input("legalName")}
        {input("registerNumber")}
        {input("registerUrl", "url")}
        {input("note", "text", false)}
        {error && (
          <p role="alert" className="text-sm text-accent">
            {t(errorKey(error))}
          </p>
        )}
        <p>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {t("credential.submit")}
          </button>
        </p>
      </form>
    </div>
  );
}
