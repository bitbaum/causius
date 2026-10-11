"use client";

/**
 * A phone photo of a letter is 3–8 MB and four of them would be a 30 MB
 * request. A letter is perfectly legible at 2000 px on its long side, so the
 * browser redraws each photo at that size as JPEG before it is sent: a few
 * hundred kilobytes a page, and nothing a model needs is lost.
 *
 * Returns base64 without the data-URL prefix. Throws when the file is not an
 * image the browser can decode.
 */
const MAX_SIDE = 2000;
const QUALITY = 0.85;

export interface ShrunkImage {
  mediaType: "image/jpeg";
  data: string;
}

export async function shrinkImage(file: File): Promise<ShrunkImage> {
  // `from-image` applies the EXIF rotation, so a page photographed sideways
  // reaches the model the way the reader saw it.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no 2d context");
    // A transparent PNG would turn black as JPEG; paper is white.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
    const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (!data) throw new Error("empty image");
    return { mediaType: "image/jpeg", data };
  } finally {
    bitmap.close();
  }
}
