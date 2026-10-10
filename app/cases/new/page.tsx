"use client";

import { byokLabel } from "@bitbaum/ai-kit/byok";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnQuiet, card, field, link, shell } from "@/components/ui";
import { newId, type CaseFile } from "@/lib/case";
import { API, ROUTES } from "@/lib/routes";
import { saveCase, useHydrated, useOwnModel } from "@/lib/store";

const LANGUAGES = [
  "English",
  "German",
  "French",
  "Italian",
  "Turkish",
  "Albanian",
  "Portuguese",
  "Spanish",
];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * What each failure means to the person, and the way past it. Fleet rule "no
 * dead ends": anything that stops someone shows the way forward on the same
 * screen, so every entry names a next step and says whether one's own model
 * or filing by hand is that step.
 */
interface Failure {
  message: string;
  ownModel?: boolean;
  byHand?: boolean;
}

const FAILURES: Record<string, Failure> = {
  not_configured: {
    message:
      "The free shared models are not switched on for this site right now. You can connect your own model, or file the letter by hand and keep track of its deadline.",
    ownModel: true,
    byHand: true,
  },
  busy: {
    message:
      "No model answered. The free shared budget for today may be used up, or a provider is down. Your own model is not affected by the shared budget.",
    ownModel: true,
    byHand: true,
  },
  busy_own: {
    message:
      "Your model did not answer. The key may have run out of credit or been revoked. Check it in the settings, or remove it to use the free shared models.",
    ownModel: true,
  },
  no_vision: {
    message:
      "None of the models available right now can read a photo. Paste the letter's text instead, or connect your own model that can read images.",
    ownModel: true,
  },
  rate_limited: {
    message:
      "That is a lot of letters in a short time. The free shared models allow a few per hour; your own model allows many more.",
    ownModel: true,
    byHand: true,
  },
  bad_own_model: {
    message: "Your saved model settings could not be used. Set them up again.",
    ownModel: true,
  },
  unreadable_analysis: {
    message:
      "The model answered, but not in a form Causius could turn into a case. Try again; a stronger model does this more reliably.",
    ownModel: true,
  },
  empty: { message: "Paste the letter's text or add a photo of it." },
  bad_image: { message: "That image could not be used. Send a JPEG, PNG or WebP under 5 MB." },
  offline: { message: "Causius could not be reached. Check your connection and try again." },
};
const UNKNOWN: Failure = { message: "The analysis did not go through. Try again in a minute." };

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export default function NewCasePage() {
  const router = useRouter();
  const ownModel = useOwnModel();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [authority, setAuthority] = useState("");
  const [deadline, setDeadline] = useState("");

  function fail(code: string) {
    const f = FAILURES[code] ?? UNKNOWN;
    setFailure(f);
    if (f.byHand) setManual(true);
  }

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    if (!text.trim() && !image) return fail("empty");
    if (image && image.size > MAX_IMAGE_BYTES) return fail("bad_image");
    setBusy(true);
    try {
      const res = await fetch(API.analyze, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          languages,
          byok: ownModel ?? undefined,
          image: image ? { mediaType: image.type, data: await toBase64(image) } : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { case?: CaseFile; error?: string };
      if (!res.ok || !body.case) {
        return fail(body.error === "busy" && ownModel ? "busy_own" : (body.error ?? ""));
      }
      saveCase(body.case);
      router.push(ROUTES.caseById(body.case.id));
    } catch {
      fail("offline");
    } finally {
      setBusy(false);
    }
  }

  function fileByHand(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const c: CaseFile = {
      version: 1,
      id: newId(),
      title: title.trim(),
      jurisdiction: "Not stated",
      area: "Not stated",
      authority: authority.trim() || "Not stated",
      received: undefined,
      reference: undefined,
      consequence: undefined,
      tierReason: undefined,
      draftReply: undefined,
      deadline: deadline || undefined,
      summary: "",
      asks: [],
      texts: text.trim() ? [{ lang: "und", label: "Original", text: text.trim() }] : [],
      notes: [],
      recommendedTier: "assistant",
      createdAt: new Date().toISOString(),
    };
    saveCase(c);
    router.push(ROUTES.caseById(c.id));
  }

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="font-heading text-4xl font-semibold tracking-display">New case</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-fg-secondary">
        Give Causius the letter. It is sent to an AI model provider to be read and is not stored by
        Causius; the result is kept in this browser only.
      </p>

      <p className="mt-5 max-w-prose rounded-card border border-border-subtle px-4 py-3 text-sm text-fg-secondary">
        {hydrated && ownModel ? (
          <>
            Read by your own model, <strong className="text-fg-primary">{byokLabel(ownModel)}</strong>
            .{" "}
          </>
        ) : (
          <>Read by free shared models, which vary and have a small daily budget. </>
        )}
        <Link href={ROUTES.ownModel} className={link}>
          {hydrated && ownModel ? "Change" : "Use your own model"}
        </Link>
      </p>

      <form onSubmit={analyse} className="mt-8 grid max-w-3xl gap-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium">
            The letter&rsquo;s text
          </label>
          <textarea
            id="text"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste it here, in any language."
            className={`${field} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium">
            Or a photo of it
          </label>
          <input
            id="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-sm text-fg-secondary file:mr-4 file:min-h-11 file:rounded-card file:border file:border-solid file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-fg-primary"
          />
          <p className="mt-1.5 text-xs text-fg-secondary">
            One page, JPEG, PNG or WebP, up to 5 MB.
          </p>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Translate it into</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = languages.includes(l);
              return (
                <label
                  key={l}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-card border px-3.5 text-sm ${
                    on ? "border-fg-primary bg-surface-raised" : "border-border-subtle"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={!on && languages.length >= 4}
                    onChange={() =>
                      setLanguages(on ? languages.filter((x) => x !== l) : [...languages, l])
                    }
                    className="accent-[var(--color-accent)]"
                  />
                  {l}
                </label>
              );
            })}
          </div>
        </fieldset>

        {failure && (
          <div role="alert" className="rounded-card border border-accent-fg px-4 py-3 text-sm">
            <p>{failure.message}</p>
            {failure.ownModel && (
              <p className="mt-2">
                <Link href={ROUTES.ownModel} className={link}>
                  Open model settings
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-5">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? "Reading the letter…" : "Analyse the letter"}
          </button>
          {!manual && (
            <button type="button" className={`${link} min-h-11`} onClick={() => setManual(true)}>
              File it by hand instead
            </button>
          )}
        </div>
      </form>

      {manual && (
        <form onSubmit={fileByHand} className={`${card} mt-10 grid max-w-3xl gap-5`}>
          <h2 className="font-heading text-2xl font-semibold">File it by hand</h2>
          <p className="text-sm text-fg-secondary">
            No analysis, but the letter and its deadline are kept together, and the case file can be
            handed to a helper. Already have a case file?{" "}
            <Link href={ROUTES.cases} className={link}>
              Import it
            </Link>
            .
          </p>
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              What is it about?
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${field} mt-2`}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="authority" className="block text-sm font-medium">
                Who sent it?
              </label>
              <input
                id="authority"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium">
                Reply by
              </label>
              <input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
          </div>
          <div>
            <button type="submit" className={btnQuiet}>
              Save case
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
