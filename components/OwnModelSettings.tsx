"use client";

import { BYOK_VENDORS, byokKeyHint, byokLabel, type ByokVendorId } from "@bitbaum/ai-kit/byok";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { API } from "@/lib/routes";
import { clearOwnModel, saveOwnModel, useHydrated, useOwnModel } from "@/lib/store";
import { btnPrimary, btnQuiet, card, field, link } from "./ui";

/**
 * "Your own model" — the fleet standard (fleet SHARED.md), browser-only variant
 * as in Heidi: pick a provider, paste a key, it is checked on its own, the
 * models that key can use are offered with the strongest preselected, one
 * button saves.
 *
 * The rules that shaped this, each a bug somebody shipped:
 *   - the vendor list is ai-kit's CLOSED list, never a URL the reader types;
 *   - the key check is ai-kit's probe, never a hand-rolled one;
 *   - the key is kept in this browser only, and shown back only as a hint;
 *   - an empty key field keeps the saved key; removing it is its own button;
 *   - no subscription login is ever asked for, only an API key.
 */
interface Probe {
  ok: boolean;
  reachable: boolean;
  message: string;
  models: string[];
  suggested: string | null;
}

/** A failure of ours (not the vendor's verdict), named so it can be said in the reader's language. */
type Local = "tooMany" | "unreachable";
type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "done"; probe: Probe; local?: Local };

const NO_ANSWER: Probe = { ok: false, reachable: false, message: "", models: [], suggested: null };

export function OwnModelSettings() {
  const t = useTranslations("Settings");
  const saved = useOwnModel();
  const hydrated = useHydrated();
  const [vendor, setVendor] = useState<ByokVendorId>("openrouter");
  const [key, setKey] = useState("");
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const [model, setModel] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const chosen = BYOK_VENDORS.find((v) => v.id === vendor) ?? BYOK_VENDORS[0];
  const trimmed = key.trim();

  // Checked on its own, ~600 ms after typing stops. The answer for a key the
  // reader has since changed is dropped rather than shown against the new one.
  useEffect(() => {
    if (!trimmed) return;
    let stale = false;
    const timer = setTimeout(async () => {
      setCheck({ state: "checking" });
      let probe: Probe;
      let local: Local | undefined;
      try {
        const response = await fetch(API.modelCheck, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vendor, key: trimmed }),
        });
        if (response.status === 429) {
          probe = NO_ANSWER;
          local = "tooMany";
        } else {
          probe = (await response.json()) as Probe;
        }
      } catch {
        probe = NO_ANSWER;
        local = "unreachable";
      }
      if (stale) return;
      setCheck({ state: "done", probe, local });
      setModel(probe.suggested ?? probe.models[0] ?? "");
    }, 600);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [vendor, trimmed]);

  const done = check.state === "done" && trimmed ? check : null;
  const probe = done?.probe ?? null;
  const canSave = Boolean(probe?.ok && model.trim());

  function reset(next: ByokVendorId) {
    setVendor(next);
    setKey("");
    setCheck({ state: "idle" });
    setModel("");
    setJustSaved(false);
  }

  return (
    <div className="grid gap-6">
      {hydrated && saved && (
        <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
          <p className="text-sm">
            <span className="block font-medium">{t("using", { label: byokLabel(saved) })}</span>
            <span className="mt-1 block font-mono text-xs text-fg-secondary">
              {t("keyKept", { hint: byokKeyHint(saved.apiKey) })}
            </span>
          </p>
          <button
            type="button"
            className={btnQuiet}
            onClick={() => {
              clearOwnModel();
              setJustSaved(false);
            }}
          >
            {t("remove")}
          </button>
        </div>
      )}

      <fieldset>
        <legend className="text-sm font-medium">{t("provider")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {BYOK_VENDORS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={v.id === vendor}
              onClick={() => reset(v.id)}
              className={
                v.id === vendor
                  ? "min-h-11 rounded-card bg-accent px-4 text-sm font-medium text-accent-contrast"
                  : btnQuiet
              }
            >
              {v.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="own-key" className="block text-sm font-medium">
          {t("keyLabel", { vendor: chosen.label })}
        </label>
        <input
          id="own-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setJustSaved(false);
          }}
          placeholder={chosen.keyHint}
          className={`${field} mt-2 max-w-xl font-mono`}
        />
        <p className="mt-2 text-sm">
          <a href={chosen.keyUrl} target="_blank" rel="noreferrer" className={link}>
            {t("getKey", { vendor: chosen.label })}
          </a>
        </p>
      </div>

      <div aria-live="polite" className="min-h-6 text-sm">
        {trimmed && check.state === "checking" && (
          <p className="text-fg-secondary">{t("checking")}</p>
        )}
        {done && probe && (
          <p className={probe.ok ? "text-fg-primary" : "text-accent-fg"}>
            {/* The vendor's own words are left as the vendor wrote them. */}
            {done.local ? t(done.local) : <span lang="en">{probe.message}</span>}
            {!probe.ok && !probe.reachable && ` ${t("notWrong")}`}
          </p>
        )}
      </div>

      {probe?.ok && (
        <div>
          <label htmlFor="own-model" className="block text-sm font-medium">
            {t("model")}
          </label>
          {probe.models.length > 0 ? (
            <select
              id="own-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={`${field} mt-2 max-w-xl`}
            >
              {probe.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                  {m === probe.suggested ? ` (${t("strongest")})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="own-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={chosen.modelExample}
              className={`${field} mt-2 max-w-xl font-mono`}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!canSave}
          className={btnPrimary}
          onClick={() => {
            saveOwnModel({ vendor, apiKey: trimmed, model: model.trim() });
            setKey("");
            setCheck({ state: "idle" });
            setJustSaved(true);
          }}
        >
          {t("use")}
        </button>
        <p aria-live="polite" className="text-sm text-fg-secondary">
          {justSaved && t("saved")}
        </p>
      </div>
    </div>
  );
}
