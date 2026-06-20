// Redis persistence for the volatile runtime session + the pin→sessionId index.
// Durable history is in Postgres; this is the live mirror with a TTL safety net.
import { redis } from "../redis.js";
import type { RuntimeSession } from "./runtime.js";

const TTL_SECONDS = 6 * 60 * 60; // a game is abandoned well before this
const rtKey = (id: string) => `game:rt:${id}`;
const pinKey = (pin: string) => `game:pin:${pin}`;

export async function saveRuntime(rt: RuntimeSession): Promise<void> {
  await redis().set(rtKey(rt.id), JSON.stringify(rt), "EX", TTL_SECONDS);
}

export async function loadRuntime(id: string): Promise<RuntimeSession | null> {
  const raw = await redis().get(rtKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RuntimeSession;
  } catch {
    return null;
  }
}

export async function deleteRuntime(id: string): Promise<void> {
  await redis().del(rtKey(id));
}

export async function mapPin(pin: string, sessionId: string): Promise<void> {
  await redis().set(pinKey(pin), sessionId, "EX", TTL_SECONDS);
}

export async function resolvePin(pin: string): Promise<string | null> {
  return redis().get(pinKey(pin));
}

export async function clearPin(pin: string): Promise<void> {
  await redis().del(pinKey(pin));
}
