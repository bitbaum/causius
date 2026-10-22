"use client";

import { ChatThread, type ChatMessageData } from "@bitbaum/chatkit/react";
import "@bitbaum/chatkit/styles.css";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { btnQuiet, card, eyebrow, field, link } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { daysUntil, formatDate } from "@/lib/case";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import type { MatterEvent, MatterView } from "@/lib/matters/store";
import { API, ROUTES } from "@/lib/routes";
import { useToday } from "@/lib/store";
import { IntakeComposer, uploadErrorKey, useChatLabels } from "./IntakeComposer";
import { MatterHelpers } from "./MatterHelpers";
import { FIRST_MESSAGE_KEY } from "./MattersHome";
import { useModelChoice } from "./ModelPicker";
import { uploadStaged, type Staged } from "./staging";

type Load = { state: "loading" } | { state: "failed"; error: string } | { state: "ready"; matter: MatterView };

const WORKING_TICK_MS = 4000;

/**
 * One matter: the conversation with the agent on the left, everything the
 * matter holds on the right — what is due, what waits for a decision, the
 * documents, and the words kept from any model.
 */
export function MatterWorkspace({ id, me }: { id: string; me: string }) {
  const t = useTranslations("Matter");
  const locale = useLocale();
  const router = useRouter();
  const choice = useModelChoice();
  const chat = useTranslations("Chat");
  const labels = useChatLabels();
  const turn = useRef<AbortController | null>(null);
  const today = useToday();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [sending, setSending] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  // When the running turn started, and a clock that ticks while it runs.
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(0);
  const firstSent = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(API.matter(id));
      const body = (await r.json().catch(() => ({}))) as { matter?: MatterView; error?: string };
      setLoad(r.ok && body.matter ? { state: "ready", matter: body.matter } : { state: "failed", error: body.error ?? "unknown" });
    } catch {
      setLoad({ state: "failed", error: "offline" });
    }
  }, [id]);

  const send = useCallback(
    async (text: string, staged: Staged[] = []): Promise<boolean> => {
      if (!text.trim() && staged.length === 0) return false;
      const words = text.trim() || chat("attachedOnly");
      setSending(true);
      setStartedAt(Date.now());
      setNow(Date.now());
      setTurnError(null);
      const controller = new AbortController();
      turn.current = controller;
      try {
        // What was attached becomes documents first, so this very turn can read it.
        if (staged.length) {
          const failure = await uploadStaged(id, staged, choice, controller.signal);
          if (failure) {
            setTurnError(`upload:${failure}`);
            return false;
          }
          await refresh();
        }
        // Show the message at once; the agent's work follows.
        setLoad((l) =>
          l.state === "ready"
            ? {
                ...l,
                matter: {
                  ...l.matter,
                  events: [
                    ...l.matter.events,
                    { id: -Date.now(), at: new Date().toISOString(), kind: "message", actor: "me", role: "user", text: words },
                  ],
                },
              }
            : l,
        );
        const r = await fetch(API.matterMessages(id), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: words, byok: choice.byok, model: choice.model, locale }),
          signal: controller.signal,
        });
        const body = (await r.json().catch(() => ({}))) as { matter?: MatterView; error?: string };
        if (r.ok && body.matter) {
          setLoad({ state: "ready", matter: body.matter });
          return true;
        }
        setTurnError(body.error === "busy" && choice.byok ? "busy_own" : (body.error ?? "unknown"));
        await refresh();
        return true;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setTurnError("stopped");
          await refresh();
          return true;
        }
        setTurnError("offline");
        return false;
      } finally {
        turn.current = null;
        setSending(false);
      }
    },
    [id, locale, choice, chat, refresh],
  );

  // Open the matter; then send the first message, if one was typed on the
  // matters page and the matter is still empty.
  useEffect(() => {
    let stale = false;
    fetch(API.matter(id))
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { matter?: MatterView; error?: string };
        if (stale) return;
        if (!r.ok || !body.matter) {
          setLoad({ state: "failed", error: body.error ?? "unknown" });
          return;
        }
        setLoad({ state: "ready", matter: body.matter });
        if (firstSent.current) return;
        firstSent.current = true;
        let first: string | null = null;
        try {
          first = sessionStorage.getItem(FIRST_MESSAGE_KEY(id));
          sessionStorage.removeItem(FIRST_MESSAGE_KEY(id));
        } catch {
          first = null;
        }
        if (first && body.matter.events.length === 0) void send(first);
      })
      .catch(() => !stale && setLoad({ state: "failed", error: "offline" }));
    return () => {
      stale = true;
    };
  }, [id, send]);

  // While a turn runs, say what is happening rather than showing a bare spinner.
  useEffect(() => {
    if (!sending) return;
    const timer = setInterval(() => setNow(Date.now()), WORKING_TICK_MS);
    return () => clearInterval(timer);
  }, [sending]);
  const working = Math.floor((now - startedAt) / WORKING_TICK_MS);

  if (load.state === "loading") return <p className="text-sm text-fg-secondary">{t("loading")}</p>;
  if (load.state === "failed") {
    return (
      <div className="py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{t(`load.${load.error === "not_found" ? "not_found" : "failed"}`)}</h1>
        <p className="mt-4">
          <Link href={ROUTES.matters} className={`${link} inline-flex min-h-11 items-center`}>
            {t("backToMatters")}
          </Link>
        </p>
      </div>
    );
  }

  const m = load.matter;
  const isOwner = m.role === "owner";
  const messages = toChat(m.events, t("agentName"), m, me);
  const stepsBefore = stepsByMessage(m.events);
  const openItems = m.items.filter((i) => i.status === "open");
  const doneItems = m.items.filter((i) => i.status === "done");
  const pending = m.approvals.filter((a) => a.status === "pending");
  const workingLines = [t("working.reading"), t("working.researching"), t("working.drafting"), t("working.checking")];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="matter-title" className="min-w-0">
        <p className={eyebrow}>{[m.core.area, jurisdictionLabel(m.jurisdiction, locale)].filter(Boolean).join(" · ") || t("newMatter")}</p>
        <h1 id="matter-title" className="mt-2 headline text-3xl sm:text-4xl">
          {m.core.title}
        </h1>
        {m.core.summary && <p className="mt-3 max-w-prose leading-relaxed text-fg-secondary">{m.core.summary}</p>}

        <div className="mt-8">
          <ChatThread
            messages={messages}
            live={sending ? { status: workingLines[working % workingLines.length] } : null}
            onReply={(text) => void send(text)}
            onStop={() => turn.current?.abort()}
            share={{ title: m.core.title || t("agentName") }}
            renderFooter={(msg) => {
              const steps = stepsBefore.get(msg.id);
              return steps?.length ? (
                <details className="mt-2 text-xs text-fg-secondary">
                  <summary className="inline-flex min-h-11 cursor-pointer items-center">{t("stepsCount", { count: steps.length })}</summary>
                  <ul className="grid gap-1 pb-2 pl-4">
                    {steps.map((s, i) => (
                      <li key={i}>
                        <span className="font-mono">{t(`tool.${TOOL_KEYS.has(s.tool) ? s.tool : "other"}`)}</span> {s.summary}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null;
            }}
            empty={<p className="text-sm text-fg-secondary">{t("emptyThread")}</p>}
            labels={labels.thread}
          />
          {turnError && (
            <p role="alert" className="mt-3 rounded-control border border-accent px-4 py-3 text-sm">
              {turnError.startsWith("upload:")
                ? chat(uploadErrorKey(turnError.slice(7)))
                : t(`errors.${TURN_ERRORS.has(turnError) ? turnError : "unknown"}`)}{" "}
              {(turnError === "not_configured" || turnError === "busy" || turnError === "busy_own") && (
                <Link href={ROUTES.ownModel} className={link}>
                  {t("openSettings")}
                </Link>
              )}
            </p>
          )}
          {m.role !== "observer" && (
            <div className="mt-4">
              <IntakeComposer
                onSend={(text, staged) => send(text, staged)}
                placeholder={t("composer")}
                sending={sending}
                onStop={() => turn.current?.abort()}
              />
            </div>
          )}
        </div>
      </section>

      <aside className="grid content-start gap-5" aria-label={t("panel")}>
        <Panel title={t("due")}>
          {openItems.length === 0 && <p className="text-sm text-fg-secondary">{t("nothingDue")}</p>}
          <ul className="grid gap-2">
            {[...openItems, ...doneItems].map((i) => {
              const days = i.due && today ? daysUntil(i.due, today) : null;
              return (
                <li key={i.id}>
                  <label className="flex min-h-11 items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                      checked={i.status === "done"}
                      disabled={m.role === "observer"}
                      onChange={async (e) => {
                        await fetch(API.matterItem(id, i.id), {
                          method: "PATCH",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ status: e.target.checked ? "done" : "open" }),
                        });
                        await refresh();
                      }}
                    />
                    <span className={`text-sm ${i.status === "done" ? "text-fg-secondary line-through" : ""}`}>
                      {i.due && (
                        <span className={`block font-medium ${days !== null && days <= 7 && i.status === "open" ? "text-accent" : ""}`}>
                          {formatDate(i.due, locale)}
                          {days !== null && i.status === "open" && ` · ${relative(days, t)}`}
                        </span>
                      )}
                      {i.label}
                      {i.quote && <span className="mt-1 block text-xs italic text-fg-secondary">«{i.quote}»</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title={t("decisions")}>
          {pending.length === 0 && <p className="text-sm text-fg-secondary">{t("noDecisions")}</p>}
          <ul className="grid gap-3">
            {pending.map((a) => {
              const doc = m.documents.find((d) => d.id === a.documentId);
              return (
                <li key={a.id} className="grid gap-2 rounded-control border border-accent p-3 text-sm">
                  <span className={eyebrow}>{t(`action.${ACTIONS.has(a.action) ? a.action : "other"}`)}</span>
                  <span>{a.summary}</span>
                  {doc && (
                    <a href={API.matterDocument(id, doc.id)} className={link}>
                      {doc.name}
                    </a>
                  )}
                  {isOwner && (
                    <span className="flex flex-wrap gap-2">
                      <DecideButton id={id} approvalId={a.id} decision="approved" label={t("approve")} onDone={refresh} primary />
                      <DecideButton id={id} approvalId={a.id} decision="rejected" label={t("decline")} onDone={refresh} />
                    </span>
                  )}
                  <span className="text-xs text-fg-secondary">{t("approveNote")}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <MatterHelpers matter={m} me={me} onChange={refresh} />

        <Panel title={t("documents")}>
          <ul className="grid gap-1">
            {m.documents.map((d) => (
              <li key={d.id} className="text-sm">
                <a href={API.matterDocument(id, d.id)} className={`${link} inline-flex min-h-11 items-center`}>
                  {d.name}
                </a>
                <span className="ml-2 text-xs text-fg-secondary">{d.origin === "draft" ? t("draft") : t("uploaded")}</span>
              </li>
            ))}
          </ul>
          {m.role !== "observer" && <Upload id={id} onDone={refresh} />}
        </Panel>

        {isOwner && <PrivacyPanel id={id} hide={m.core.hide} onDone={refresh} />}

        {isOwner && (
          <button
            type="button"
            className={`${btnQuiet} justify-self-start`}
            onClick={async () => {
              if (!window.confirm(t("deleteConfirm"))) return;
              await fetch(API.matter(id), { method: "DELETE" });
              router.push(ROUTES.matters);
            }}
          >
            {t("delete")}
          </button>
        )}
      </aside>
    </div>
  );
}

const TOOL_KEYS = new Set([
  "web_search",
  "read_page",
  "record_deadline",
  "add_task",
  "note_fact",
  "update_matter",
  "draft_document",
  "request_approval",
  "error",
]);
const ACTIONS = new Set(["send", "file", "sign", "share", "pay"]);
const TURN_ERRORS = new Set(["stopped", "not_configured", "busy", "busy_own", "rate_limited", "bad_own_model", "offline", "not_allowed"]);

function relative(days: number, t: ReturnType<typeof useTranslations>): string {
  if (days > 1) return t("daysLeft", { days });
  if (days === 1) return t("tomorrow");
  if (days === 0) return t("today");
  return t("overdue", { days: -days });
}

/**
 * Messages for chatkit, with the sources an answer cited. Once a helper works
 * on the matter, a message from someone other than the reader carries the name
 * they go by here: the owner is "Client", a helper their public name.
 */
function toChat(events: MatterEvent[], agentName: string, m: MatterView, me: string): ChatMessageData[] {
  const alias = new Map(m.participants.map((p) => [p.sub, p.alias]));
  const shared = m.participants.length > 1;
  return events.flatMap((e): ChatMessageData[] => {
    if (e.kind !== "message") return [];
    const citations = e.sources?.length
      ? Object.fromEntries(e.sources.map((s) => [s.id, { label: s.title, detail: s.url }]))
      : undefined;
    return [
      {
        id: String(e.id),
        role: e.role,
        content: e.sources?.length
          ? `${e.text}\n\n${e.sources.map((s) => `[${s.id}] [${s.title}](${s.url})`).join("  \n")}`
          : e.text,
        citations,
        replies: e.replies,
        speaker:
          e.role === "assistant"
            ? { name: agentName }
            : shared && e.actor !== me && e.actor !== "me"
              ? { name: alias.get(e.actor) ?? "" }
              : undefined,
      },
    ];
  });
}

/** The agent's steps, grouped under the answer they led to. */
function stepsByMessage(events: MatterEvent[]): Map<string, { tool: string; summary: string }[]> {
  const out = new Map<string, { tool: string; summary: string }[]>();
  let pending: { tool: string; summary: string }[] = [];
  for (const e of events) {
    if (e.kind === "step") pending.push({ tool: e.tool, summary: e.summary });
    else if (e.role === "assistant") {
      out.set(String(e.id), pending);
      pending = [];
    }
  }
  return out;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={`${card} grid gap-3`}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function DecideButton(props: {
  id: string;
  approvalId: string;
  decision: "approved" | "rejected";
  label: string;
  primary?: boolean;
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className={
        props.primary
          ? "inline-flex min-h-11 items-center rounded-control bg-accent px-4 text-sm font-medium text-on-accent hover:opacity-85 disabled:opacity-50"
          : btnQuiet
      }
      onClick={async () => {
        setBusy(true);
        await fetch(API.matterApproval(props.id, props.approvalId), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ decision: props.decision }),
        });
        await props.onDone();
        setBusy(false);
      }}
    >
      {props.label}
    </button>
  );
}

function Upload({ id, onDone }: { id: string; onDone: () => Promise<void> }) {
  const t = useTranslations("Matter");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-1">
      <label className={`${btnQuiet} cursor-pointer justify-self-start focus-within:outline-2`}>
        {busy ? t("uploading") : t("upload")}
        <input
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="sr-only"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            const form = new FormData();
            form.set("file", file);
            const r = await fetch(API.matterDocuments(id), { method: "POST", body: form }).catch(() => null);
            if (!r?.ok) {
              const body = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
              setError(body?.error ?? "offline");
            }
            await onDone();
            setBusy(false);
          }}
        />
      </label>
      <p className="text-xs text-fg-secondary">{t("uploadHint")}</p>
      {error && (
        <p role="alert" className="text-xs text-accent">
          {t(`uploadErrors.${UPLOAD_ERRORS.has(error) ? error : "unknown"}`)}
        </p>
      )}
    </div>
  );
}
const UPLOAD_ERRORS = new Set(["too_large", "unsupported_type", "scanned_pdf", "unreadable", "rate_limited"]);

function PrivacyPanel({ id, hide, onDone }: { id: string; hide: string[]; onDone: () => Promise<void> }) {
  const t = useTranslations("Matter");
  const [draft, setDraft] = useState(hide.join(", "));
  const [saved, setSaved] = useState(false);
  return (
    <section className={`${card} grid gap-3`}>
      <h2 className="text-lg font-semibold tracking-tight">{t("privacy")}</h2>
      <p className="text-sm leading-relaxed text-fg-secondary">{t("privacyLead")}</p>
      <form
        className="grid gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const words = draft.split(/[,;\n]/).map((w) => w.trim()).filter((w) => w.length >= 2);
          await fetch(API.matter(id), {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ hide: words }),
          });
          setSaved(true);
          await onDone();
        }}
      >
        <label className="grid gap-1 text-sm font-medium">
          {t("hideWords")}
          <input value={draft} onChange={(e) => { setDraft(e.target.value); setSaved(false); }} className={field} placeholder={t("hidePlaceholder")} />
        </label>
        <span className="flex items-center gap-3">
          <button type="submit" className={btnQuiet}>
            {t("save")}
          </button>
          <span aria-live="polite" className="text-xs text-fg-secondary">
            {saved && t("saved")}
          </span>
        </span>
      </form>
    </section>
  );
}
