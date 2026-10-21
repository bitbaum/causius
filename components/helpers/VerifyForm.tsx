"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, field, label as labelClass, link } from "@/components/ui";
import { formatDate } from "@/lib/case";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { API } from "@/lib/routes";

type Outcome =
  | { ok: true; jurisdiction: string; expiresAt: string; disclosed: Record<string, string>; revoked: boolean }
  | { ok: false; reason: string };

const REASONS = ["malformed", "unknown_key", "bad_signature", "expired", "wrong_issuer", "bad_disclosure", "rate_limited", "not_configured"];

/** Check an attestation, and optionally the disclosures a lawyer gave you. */
export function VerifyForm({ initialToken }: { initialToken: string }) {
  const t = useTranslations("Verify");
  const locale = useLocale();
  const [token, setToken] = useState(initialToken);
  const [disclosures, setDisclosures] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await fetch(API.verify, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, disclosures: disclosures.split(/\s+/).filter(Boolean) }),
      });
      const body = (await r.json().catch(() => ({}))) as {
        error?: string;
        status?: string | null;
        result?: { ok: true; jurisdiction: string; expiresAt: string; disclosed: Record<string, string> } | { ok: false; reason: string };
      };
      if (!r.ok || !body.result) setOutcome({ ok: false, reason: body.error ?? "unknown" });
      else if (!body.result.ok) setOutcome(body.result);
      else setOutcome({ ...body.result, revoked: body.status === "revoked" });
    } catch {
      setOutcome({ ok: false, reason: "unknown" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={check} className="grid gap-4">
      <label className="grid gap-1">
        <span className={labelClass}>{t("token")}</span>
        <textarea value={token} onChange={(e) => setToken(e.target.value)} rows={5} required className={`${field} font-mono text-xs`} />
      </label>
      <label className="grid gap-1">
        <span className={labelClass}>{t("disclosures")}</span>
        <textarea value={disclosures} onChange={(e) => setDisclosures(e.target.value)} rows={3} className={`${field} font-mono text-xs`} />
      </label>
      <p>
        <button type="submit" className={btnPrimary} disabled={busy || !token.trim()}>
          {busy ? t("checking") : t("check")}
        </button>
      </p>
      {outcome && (
        <div role="status" className="grid gap-1">
          {outcome.ok ? (
            <>
              <p className={outcome.revoked ? "text-accent" : "font-medium text-status-positive"}>
                {outcome.revoked
                  ? t("revoked")
                  : t("ok", { place: jurisdictionLabel(outcome.jurisdiction, locale), date: formatDate(outcome.expiresAt.slice(0, 10), locale) })}
              </p>
              {Object.entries(outcome.disclosed).map(([claim, value]) => (
                <p key={claim}>{t("disclosed", { claim: t(`claims.${claim === "register_number" ? "register_number" : "legal_name"}`), value })}</p>
              ))}
            </>
          ) : (
            <p className="text-accent">{t(`reasons.${REASONS.includes(outcome.reason) ? outcome.reason : "unknown"}`)}</p>
          )}
        </div>
      )}
      <p className="text-sm text-fg-secondary">
        {t("how")}{" "}
        <a href={API.jwks} className={link}>
          {t("keys")}
        </a>
      </p>
    </form>
  );
}
