// Pure validation for the question `image` field. The frontend sends the image as
// either null (no image) or a data-URL string (e.g. "data:image/png;base64,...").
// The DB column is JSONB; a JSON string is stored verbatim. We cap the size so a
// huge inline image can't blow past the body limit / bloat the DB and so it can't
// be forwarded unbounded to every connected player.

// ~700 KB of characters. A base64 data URL is ~4/3 the binary size, so this caps the
// underlying image at roughly 500 KB while staying well under the 8 MiB body limit.
export const MAX_IMAGE_CHARS = 700_000;

export type ImageValidation =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

// Validate an incoming `image` value.
// - `undefined`  -> field omitted (caller decides: leave unchanged on PATCH).
// - `null`       -> explicit clear.
// - string       -> must be a data: URL and within the size cap.
// Anything else (number, object, array, ...) is rejected.
export function validateImage(value: unknown): ImageValidation {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: "image must be a data URL or null" };
  if (value.length > MAX_IMAGE_CHARS) return { ok: false, error: "image too large" };
  if (!value.startsWith("data:")) return { ok: false, error: "image must be a data URL or null" };
  return { ok: true, value };
}
