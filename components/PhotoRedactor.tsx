"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { ShrunkImage } from "@/lib/shrink-image";
import { btnPrimary, btnQuiet } from "./ui";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Black out parts of a page photo before it is sent.
 *
 * Text can be anonymised by finding names in it; a photo cannot, without
 * reading it — and reading it is exactly what is being avoided. So the reader
 * covers their own name, address and numbers by dragging boxes over them. The
 * boxes are burnt into the pixels and the image is re-encoded, so what leaves
 * the browser no longer contains what was under them. Nothing is uploaded
 * while editing.
 *
 * Pointer events, so it works with a finger as well as a mouse. Coordinates
 * are kept as fractions of the image, so the boxes survive a resize.
 */
export function PhotoRedactor({
  image,
  label,
  onDone,
  onCancel,
}: {
  image: ShrunkImage;
  label: string;
  /** The re-encoded image, and how many areas were covered in this session. */
  onDone: (next: ShrunkImage, covered: number) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Redact");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  // Draw the photo and every box, whenever either changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const draw = () => {
      const img = imgRef.current;
      const ctx = canvas.getContext("2d");
      if (!img || !ctx) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "#000";
      for (const b of draft ? [...boxes, draft] : boxes) {
        ctx.fillRect(b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height);
      }
    };
    if (imgRef.current) return draw();
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = `data:${image.mediaType};base64,${image.data}`;
  }, [image, boxes, draft]);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function boxFrom(a: { x: number; y: number }, b: { x: number; y: number }): Box {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
  }

  function finish() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (boxes.length === 0) return onDone(image, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onDone({ mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) }, boxes.length);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("photoTitle", { label })}
      className="fixed inset-0 z-50 flex flex-col bg-surface-page"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-2 sm:px-8">
        <div>
          <p className="text-lg font-semibold tracking-tight">{t("photoTitle", { label })}</p>
          <p className="text-sm text-fg-secondary">{t("photoHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnQuiet}
            disabled={boxes.length === 0}
            onClick={() => setBoxes(boxes.slice(0, -1))}
          >
            {t("undo")}
          </button>
          <button type="button" className={btnQuiet} onClick={onCancel}>
            {t("cancel")}
          </button>
          <button type="button" className={btnPrimary} onClick={finish}>
            {t("done", { count: boxes.length })}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-8">
        <canvas
          ref={canvasRef}
          aria-label={t("canvas")}
          className="mx-auto block max-h-full max-w-full cursor-crosshair touch-none shadow"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            start.current = point(e);
          }}
          onPointerMove={(e) => {
            if (start.current) setDraft(boxFrom(start.current, point(e)));
          }}
          onPointerUp={(e) => {
            if (!start.current) return;
            const box = boxFrom(start.current, point(e));
            start.current = null;
            setDraft(null);
            // A tap is not a box.
            if (box.w > 0.01 && box.h > 0.005) setBoxes((b) => [...b, box]);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDraft(null);
          }}
        />
      </div>
    </div>
  );
}
