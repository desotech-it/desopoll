// Client-side image downscaling so question images fit comfortably inside the
// JSON body limit (backend bodyLimit is 8 MiB, image data-URL cap ~700k chars).
// The geometry helper is pure + unit-tested; the canvas path needs the DOM.

// Default max dimension (longest side) and JPEG quality for question images.
export const MAX_DIM = 1024;
export const DEFAULT_QUALITY = 0.8;
// Soft target so the resulting data URL stays well under the backend cap.
export const TARGET_BYTES = 500 * 1024; // ~500 KB

export interface Dims {
  w: number;
  h: number;
}

// Pure: compute the target {w,h} that fits inside a square of `maxDim`,
// preserving aspect ratio. Never upscales (an image already within the box is
// returned unchanged). Rounds to whole pixels and clamps to a minimum of 1.
export function fitWithin(srcW: number, srcH: number, maxDim: number): Dims {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    return { w: 1, h: 1 };
  }
  const longest = Math.max(srcW, srcH);
  if (longest <= maxDim) {
    return { w: Math.round(srcW), h: Math.round(srcH) };
  }
  const scale = maxDim / longest;
  return {
    w: Math.max(1, Math.round(srcW * scale)),
    h: Math.max(1, Math.round(srcH * scale)),
  };
}

// Rough byte size of a base64 data URL (4 chars ≈ 3 bytes of payload).
export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossibile leggere l'immagine."));
    };
    img.src = url;
  });
}

// Turn a user-selected File into a resized JPEG data URL. Downscales the longest
// side to `maxDim` and re-encodes as JPEG, stepping quality down until the
// result fits under TARGET_BYTES. DOM-dependent (canvas) — not unit-tested here.
export async function fileToResizedDataUrl(
  file: File,
  maxDim: number = MAX_DIM,
  quality: number = DEFAULT_QUALITY,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Il file selezionato non è un'immagine.");
  }
  const img = await loadImage(file);
  const { w, h } = fitWithin(img.naturalWidth || img.width, img.naturalHeight || img.height, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile.");
  // White matte so transparent PNGs don't turn black under JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  let q = quality;
  let out = canvas.toDataURL("image/jpeg", q);
  // Step quality down (a few times) if still too large.
  for (let i = 0; i < 5 && dataUrlByteLength(out) > TARGET_BYTES && q > 0.4; i++) {
    q = Math.max(0.4, q - 0.12);
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}
