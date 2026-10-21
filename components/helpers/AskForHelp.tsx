"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { btnPrimary, btnQuiet, field, link } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { anonymiseRequest } from "@/lib/helpers/request-preview";
import type { MatterSummary, MatterView } from "@/lib/matters/store";
import { API, ROUTES } from "@/lib/routes";

/**
 * Ask this helper about one of your matters. Only matters you own are offered:
 * a helper cannot bring in another helper. What they will see is chosen here,
 * without your personal details unless you say otherwise.
 */
export function AskForHelp({ helperId, preselect }: { helperId: string; preselect?: string }) {
  const t = useTranslations("Helper.ask");
  const [matters, setMatters] = useState<MatterSummary[] | null>(null);
  const [matterId, setMatterId] = useState(preselect ?? "");
  const [message, setMessage] = useState("");
  const [sees, setSees] = useState<"anonymised" | "full">("anonymised");
  const [state, setState] = useState<{ kind: "idle" | "sending" } | { kind: "sent"; matterId: string } | { kind: "error"; code: string }>({
    kind: "idle",
  });

  useEffect(() => {
    let stale = false;
    fetch(API.matters)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { matters?: MatterSummary[]; error?: string };
        if (stale) return;
        const own = (body.matters ?? []).filter((m) => m.role === "owner");
        setMatters(own);
        setMatterId((cur) => (cur && own.some((m) => m.id === cur) ? cur : (own[0]?.id ?? "")));
        if (!r.ok) setState({ kind: "error", code: body.error ?? "unknown" });
      })
      .catch(() => !stale && setMatters([]));
    return () => {
      stale = true;
    };
  }, []);

  // The owner's own view of the chosen matter: its title and the words kept from
  // everyone, so the preview below is exactly what the server will store.
  const [core, setCore] = useState<MatterView["core"] | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!matterId) return;
    let stale = false;
    fetch(API.matter(matterId))
      .then((r) => (r.ok ? (r.json() as Promise<{ matter: MatterView }>) : null))
      .then((b) => b && !stale && setCore(b.matter.core))
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [matterId, reload]);
  const preview = useMemo(
    () => (core && sees === "anonymised" ? anonymiseRequest({ title: core.title, area: core.area, message }, core.hide) : null),
    [core, sees, message],
  );
  const [extra, setExtra] = useState("");
  async function hideWord() {
    const word = extra.trim();
    if (!core || word.length < 2) return;
    await fetch(API.matter(matterId), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hide: [...new Set([...core.hide, word])] }),
    });
    setExtra("");
    setReload((n) => n + 1);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });
    try {
      const r = await fetch(API.matterEngagements(matterId), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ helperId, message, sees }),
      });
      const body = (await r.json().catch(() => ({}))) as { error?: string };
      setState(r.ok ? { kind: "sent", matterId } : { kind: "error", code: body.error ?? "unknown" });
    } catch {
      setState({ kind: "error", code: "unknown" });
    }
  }

  if (matters === null) return null;
  if (matters.length === 0)
    return (
      <p className="text-sm text-fg-secondary">
        {t("noMatters")}{" "}
        <Link href={ROUTES.matters} className={link}>
          {t("start")}
        </Link>
      </p>
    );
  if (state.kind === "sent")
    return (
      <p role="status" className="text-sm">
        {t("sent")}{" "}
        <Link href={ROUTES.matterById(state.matterId)} className={link}>
          {t("openMatter")}
        </Link>
      </p>
    );

  const known = ["already_asked", "own_profile", "helper_unavailable", "rate_limited", "not_configured"];
  return (
    <form onSubmit={send} className="grid gap-4">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("matter")}</span>
        <select value={matterId} onChange={(e) => setMatterId(e.target.value)} className={field} required>
          {matters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">{t("message")}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("placeholder")}
          rows={4}
          maxLength={4000}
          required
          className={field}
        />
      </label>
      <fieldset className="grid gap-2 text-sm">
        <legend className="mb-1 font-medium">{t("sees")}</legend>
        {(["anonymised", "full"] as const).map((v) => (
          <label key={v} className="flex min-h-11 items-center gap-3">
            <input type="radio" name="sees" value={v} checked={sees === v} onChange={() => setSees(v)} />
            {t(v)}
          </label>
        ))}
      </fieldset>
      {preview && message.trim() && (
        <div className="grid gap-2 rounded-control border border-border-subtle p-3 text-sm">
          <p className="kicker">{t("preview")}</p>
          <p className="font-medium">{preview.title}</p>
          <p className="whitespace-pre-line">{preview.message}</p>
          <div className="flex gap-2">
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={t("alsoHide")}
              aria-label={t("alsoHide")}
              className={field}
            />
            <button type="button" onClick={hideWord} className={btnQuiet} disabled={extra.trim().length < 2}>
              {t("hide")}
            </button>
          </div>
        </div>
      )}
      {state.kind === "error" && (
        <p role="alert" className="text-sm text-accent">
          {t(`errors.${known.includes(state.code) ? state.code : "unknown"}`)}
        </p>
      )}
      <p>
        <button type="submit" className={btnPrimary} disabled={state.kind === "sending" || !message.trim() || !matterId}>
          {state.kind === "sending" ? t("sending") : t("send")}
        </button>
      </p>
    </form>
  );
}
