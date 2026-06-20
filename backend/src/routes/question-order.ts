// Pure helpers for the "reorder questions" endpoint. Kept free of DB/Fastify so the
// ordering logic can be unit-tested in isolation.

export type OrderValidation =
  | { ok: true }
  | { ok: false; error: string };

// The requested order must be a permutation of the quiz's existing question ids:
// no duplicates, no unknown ids, and every existing question must appear exactly once.
export function validateOrder(existingIds: string[], order: string[]): OrderValidation {
  if (!Array.isArray(order)) return { ok: false, error: "order must be an array" };
  if (order.length !== existingIds.length) {
    return { ok: false, error: "order must list every question exactly once" };
  }
  const seen = new Set<string>();
  for (const id of order) {
    if (typeof id !== "string" || !id) return { ok: false, error: "order must contain question ids" };
    if (seen.has(id)) return { ok: false, error: "order contains duplicate ids" };
    seen.add(id);
  }
  const existing = new Set(existingIds);
  for (const id of order) {
    if (!existing.has(id)) return { ok: false, error: "order contains an id not in this quiz" };
  }
  // Same length + all-present + no-dupes implies it's a permutation, so the reverse
  // check (every existing id is in the order) is already guaranteed.
  return { ok: true };
}

// Map an ordered list of question ids to their final 1..n positions.
export function computePositions(order: string[]): { id: string; position: number }[] {
  return order.map((id, i) => ({ id, position: i + 1 }));
}
