"use client";

import { Composer, type ComposerLabelOverrides } from "@bitbaum/chatkit/react";
import "@bitbaum/chatkit/styles.css";
import { AttachMenu } from "@bitbaum/chatkit/attach";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PhotoRedactor } from "@/components/PhotoRedactor";
import { Link } from "@/i18n/navigation";
import { MAX_PAGES } from "@/lib/analyze-limits";
import { newId } from "@/lib/case";
import { ROUTES } from "@/lib/routes";
import { shrinkImage } from "@/lib/shrink-image";
import { ModelPicker } from "./ModelPicker";
import { UPLOAD_ERRORS, type Staged } from "./staging";

const FILE_MAX_BYTES = 10 * 1024 * 1024;
const TEXT_FILE = /\.(txt|md)$/i;

/** The words chatkit shows, in the reader's language. */
export function useChatLabels() {
  const t = useTranslations("Chat");
  const composer: ComposerLabelOverrides = {
    send: t("send"),
    stop: t("stop"),
    voice: t("voice"),
    voiceStop: t("voiceStop"),
    cancelRecording: t("cancelRecording"),
    confirmRecording: t("confirmRecording"),
    listening: t("listening"),
    transcribing: t("transcribing"),
    attach: t("attach"),
    queue: t("queue"),
    remove: (name: string) => t("remove", { name }),
    dismiss: t("dismiss"),
    retryTake: t("retryTake"),
    dictation: {
      mic: t("dictMic"),
      silence: t("dictSilence"),
      unavailable: t("dictUnavailable"),
      fileTooLarge: t("dictFileTooLarge"),
    },
    attachMenu: {
      title: t("attachTitle"),
      close: t("close"),
      sources: { camera: t("camera"), photos: t("photos"), files: t("files") },
    },
  };
  const attachMenu = {
    attach: t("attach"),
    title: t("attachTitle"),
    close: t("close"),
    sources: { camera: t("camera"), photos: t("photos"), files: t("files") },
  };
  const thread = {
    copy: t("copy"),
    copied: t("copied"),
    listen: t("listen"),
    share: t("share"),
    retry: t("retry"),
    stop: t("stop"),
    working: t("working"),
    stopped: t("stopped"),
    jump: t("jump"),
    failed: t("failed"),
    loading: t("loading"),
    replies: t("replies"),
    // chatkit fills in `{time}` itself, so the words reach it as written.
    thoughtFor: t.raw("thoughtFor") as string,
    thought: t("thought"),
    thinking: t("thinking"),
  };
  return { composer, attachMenu, thread };
}

/**
 * THE message box for a matter, on the start screen and inside a matter: type,
 * speak, or attach photos, PDFs and text files, and choose the model.
 *
 * Photos are shrunk and then covered by the person in the browser before they
 * are staged; nothing is uploaded until Send. A photo with nothing covered
 * asks once more before it goes, and "send as they are" is one tap.
 */
export function IntakeComposer({
  onSend,
  sending,
  onStop,
  placeholder,
  above,
  disabled,
}: {
  /** Deliver the words and what was attached. Resolve false to keep the draft and the attachments. */
  onSend: (text: string, staged: Staged[]) => Promise<boolean>;
  sending: boolean;
  onStop?: () => void;
  placeholder: string;
  above?: React.ReactNode;
  disabled?: boolean;
}) {
  const t = useTranslations("Chat");
  const r = useTranslations("Redact");
  const labels = useChatLabels();
  const [staged, setStaged] = useState<Staged[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [warned, setWarned] = useState(false);

  async function stage(files: FileList | null) {
    if (!files?.length) return;
    setNote(null);
    let room = MAX_PAGES + 4 - staged.length;
    const next: Staged[] = [];
    for (const file of Array.from(files)) {
      if (room <= 0) {
        setNote(t("noteTooMany", { max: MAX_PAGES + 4 }));
        break;
      }
      if (file.type.startsWith("image/")) {
        const pages = staged.filter((s) => s.kind === "page").length + next.filter((s) => s.kind === "page").length;
        if (pages >= MAX_PAGES) {
          setNote(t("noteTooMany", { max: MAX_PAGES }));
          continue;
        }
        try {
          const shrunk = await shrinkImage(file);
          next.push({ kind: "page", id: newId(), name: file.name, covered: 0, ...shrunk });
          room--;
        } catch {
          setNote(t("noteUnreadable", { name: file.name }));
        }
      } else if (file.type === "application/pdf" || file.type.startsWith("text/") || TEXT_FILE.test(file.name)) {
        if (file.size > FILE_MAX_BYTES) setNote(t("errTooLarge"));
        else {
          next.push({ kind: "file", id: newId(), name: file.name, file });
          room--;
        }
      } else {
        setNote(t("noteWrongType", { name: file.name }));
      }
    }
    if (!next.length) return;
    setStaged((current) => [...current, ...next]);
    setWarned(false);
    // Covering is the first thing offered for a photo, not a thing to find.
    const firstPhoto = next.find((s) => s.kind === "page");
    if (firstPhoto) setEditing(firstPhoto.id);
  }

  const editingPage = staged.find((s) => s.id === editing && s.kind === "page");
  const uncovered = staged.filter((s) => s.kind === "page" && s.covered === 0).length;

  return (
    <div>
      {editingPage?.kind === "page" && (
        <PhotoRedactor
          image={editingPage}
          label={t("page", { n: staged.filter((s) => s.kind === "page").findIndex((s) => s.id === editingPage.id) + 1 })}
          onCancel={() => setEditing(null)}
          onDone={(next, covered) => {
            setStaged((current) =>
              current.map((s) => (s.id === editingPage.id && s.kind === "page" ? { ...s, ...next, covered: s.covered + covered } : s)),
            );
            setEditing(null);
          }}
        />
      )}
      <Composer
        onSend={async (text) => {
          if (uncovered > 0 && !warned) {
            setWarned(true);
            return false;
          }
          const ok = await onSend(text, staged);
          if (ok) {
            setStaged([]);
            setWarned(false);
            setNote(null);
          }
          return ok;
        }}
        placeholder={placeholder}
        sending={sending}
        onStop={onStop}
        disabled={disabled}
        voice={{ transcribeUrl: "/api/transcribe", prefer: "server" }}
        attach={false}
        heldAttachments={staged.length}
        attachmentOnlyText={t("attachedOnly")}
        above={above}
        labels={labels.composer}
        header={
          staged.length || note ? (
            <div className="grid gap-2 px-3 pt-3">
              {staged.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {staged.map((s) => (
                    <li key={s.id} className="flex min-h-11 items-center gap-2 rounded-control border border-border px-3 text-sm">
                      <span className="max-w-[12rem] truncate">{s.name}</span>
                      {s.kind === "page" && (
                        <button type="button" className="text-link min-h-11" onClick={() => setEditing(s.id)}>
                          {s.covered ? `${t("covered", { count: s.covered })} · ${t("coverMore")}` : t("cover")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="min-h-11 min-w-11 text-fg-secondary"
                        aria-label={t("remove", { name: s.name })}
                        onClick={() => setStaged((c) => c.filter((x) => x.id !== s.id))}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {uncovered > 0 && (
                <p className="text-xs text-fg-secondary" role={warned ? "alert" : undefined}>
                  {warned ? t("sendUncovered", { count: uncovered }) : t("coverHint")}
                </p>
              )}
              {note && (
                <p role="alert" className="text-xs text-accent">
                  {note}
                </p>
              )}
            </div>
          ) : null
        }
        tools={
          <>
            <AttachMenu sources={["camera", "photos", "files"]} onFiles={stage} labels={labels.attachMenu} disabled={disabled || sending} />
          </>
        }
        footer={
          <div className="grid gap-2 px-3 pb-3">
            <ModelPicker />
            <p className="text-xs text-fg-secondary">
              {t("voiceNote")}{" "}
              <Link href={ROUTES.security} className="text-link">
                {t("voiceWhy")}
              </Link>
            </p>
          </div>
        }
      />
      {warned && uncovered > 0 && <span className="sr-only">{r("notCovered")}</span>}
    </div>
  );
}

export function uploadErrorKey(code: string): string {
  return UPLOAD_ERRORS[code] ?? "errUpload";
}
