import type { FastifyRequest, FastifyReply } from "fastify";
import { readSession } from "./session.js";
import { findUserById, type AppUser } from "./users.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AppUser;
  }
}

// Resolve the signed-in user from the session cookie, or null.
export async function loadUser(req: FastifyRequest): Promise<AppUser | null> {
  const sess = await readSession(req);
  if (!sess) return null;
  return findUserById(sess.userId);
}

// Guard for authenticated routes. Returns the user, or sends 401 and returns null.
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<AppUser | null> {
  const user = await loadUser(req);
  if (!user || user.status !== "active") {
    reply.code(401).send({ error: "not authenticated" });
    return null;
  }
  req.user = user;
  return user;
}

// Guard for admin-only routes. Returns the user, or sends 401/403 and returns null.
export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<AppUser | null> {
  const user = await requireAuth(req, reply);
  if (!user) return null;
  if (user.role !== "admin") {
    reply.code(403).send({ error: "admin only" });
    return null;
  }
  return user;
}
