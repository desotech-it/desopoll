import type { FastifyInstance } from "fastify";
import type { Env } from "../env.js";
import { buildAuthUrl, handleCallback } from "./oidc.js";
import { upsertOidcUser, verifyLocalPassword, findUserById } from "./users.js";
import { createSession, readSession, destroySession, setSessionCookie, clearSessionCookie } from "./session.js";

export async function registerAuthRoutes(app: FastifyInstance, env: Env): Promise<void> {
  const secure = env.NODE_ENV === "production";

  // Tells the frontend which login methods are available.
  app.get("/api/auth/config", async () => ({ oidc: env.oidcEnabled, localLogin: true }));

  // Start SSO: redirect to the IdP.
  app.get("/api/auth/login", async (req, reply) => {
    if (!env.oidcEnabled) return reply.code(501).send({ error: "SSO not configured" });
    const redirectAfter = (req.query as { redirect?: string }).redirect || "/";
    return reply.redirect(await buildAuthUrl(env, redirectAfter));
  });

  // SSO callback: exchange the code, provision the user, open a session.
  app.get("/api/auth/callback", async (req, reply) => {
    if (!env.oidcEnabled) return reply.code(501).send({ error: "SSO not configured" });
    try {
      const res = await handleCallback(env, req.query as Record<string, string>);
      const isAdmin = Boolean(env.OIDC_ADMIN_GROUP && res.groups.includes(env.OIDC_ADMIN_GROUP));
      const user = await upsertOidcUser({ email: res.email, displayName: res.name, isAdmin });
      setSessionCookie(reply, await createSession(user.id), secure);
      const base = env.APP_BASE_URL.replace(/\/$/, "");
      return reply.redirect(res.redirectAfter.startsWith("/") ? `${base}${res.redirectAfter}` : base);
    } catch (err) {
      req.log.error({ err }, "oidc callback failed");
      return reply.code(401).send({ error: "SSO login failed" });
    }
  });

  // Local email + password login (kept alongside SSO, e.g. emergency admin).
  app.post("/api/auth/login/local", async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string; password?: string };
    if (!body.email || !body.password) return reply.code(400).send({ error: "email and password required" });
    const user = await verifyLocalPassword(body.email, body.password);
    if (!user) return reply.code(401).send({ error: "invalid credentials" });
    setSessionCookie(reply, await createSession(user.id), secure);
    return { user };
  });

  app.post("/api/auth/logout", async (req, reply) => {
    await destroySession(req);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/me", async (req, reply) => {
    const sess = await readSession(req);
    const user = sess ? await findUserById(sess.userId) : null;
    if (!user) return reply.code(401).send({ error: "not authenticated" });
    return { user };
  });
}
