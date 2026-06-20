import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { redis } from "../redis.js";

const COOKIE = "sid";
const TTL_SECONDS = 8 * 60 * 60; // 8h

interface SessionData {
  userId: string;
  createdAt: number;
}

export async function createSession(userId: string): Promise<string> {
  const id = randomUUID();
  const data: SessionData = { userId, createdAt: Date.now() };
  await redis().set(`sess:${id}`, JSON.stringify(data), "EX", TTL_SECONDS);
  return id;
}

export async function readSession(req: FastifyRequest): Promise<SessionData | null> {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  const payload = await redis().get(`sess:${unsigned.value}`);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(req: FastifyRequest): Promise<void> {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return;
  const unsigned = req.unsignCookie(raw);
  if (unsigned.valid && unsigned.value) await redis().del(`sess:${unsigned.value}`);
}

export function setSessionCookie(reply: FastifyReply, id: string, secure: boolean): void {
  reply.setCookie(COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
    signed: true,
    maxAge: TTL_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(COOKIE, { path: "/" });
}
