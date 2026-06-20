import { Issuer, generators, type Client } from "openid-client";
import { redis } from "../redis.js";
import type { Env } from "../env.js";

let clientPromise: Promise<Client> | null = null;

async function getClient(env: Env): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const issuer = await Issuer.discover(env.OIDC_ISSUER!);
      return new issuer.Client({
        client_id: env.OIDC_CLIENT_ID!,
        client_secret: env.OIDC_CLIENT_SECRET!,
        redirect_uris: [env.oidcRedirectUri],
        response_types: ["code"],
      });
    })().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function buildAuthUrl(env: Env, redirectAfter: string): Promise<string> {
  const client = await getClient(env);
  const state = generators.state();
  const nonce = generators.nonce();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  await redis().set(`oidc:${state}`, JSON.stringify({ nonce, codeVerifier, redirectAfter }), "EX", 600);
  return client.authorizationUrl({
    scope: env.OIDC_SCOPES,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
}

export interface OidcResult {
  email: string;
  name?: string;
  groups: string[];
  redirectAfter: string;
}

export async function handleCallback(env: Env, params: Record<string, string>): Promise<OidcResult> {
  const client = await getClient(env);
  const state = params.state;
  if (!state) throw new Error("missing state");
  const stored = await redis().get(`oidc:${state}`);
  if (!stored) throw new Error("unknown or expired state");
  await redis().del(`oidc:${state}`);
  const { nonce, codeVerifier, redirectAfter } = JSON.parse(stored) as {
    nonce: string;
    codeVerifier: string;
    redirectAfter: string;
  };

  const tokenSet = await client.callback(env.oidcRedirectUri, params, { state, nonce, code_verifier: codeVerifier });
  const claims = tokenSet.claims() as Record<string, unknown>;

  let email = claims.email as string | undefined;
  let name = (claims.name as string | undefined) ?? (claims.preferred_username as string | undefined);
  let groups = claims[env.OIDC_GROUPS_CLAIM] as string[] | undefined;

  if (!email || !groups) {
    try {
      const ui = (await client.userinfo(tokenSet)) as Record<string, unknown>;
      email = email ?? (ui.email as string | undefined);
      name = name ?? (ui.name as string | undefined);
      groups = groups ?? (ui[env.OIDC_GROUPS_CLAIM] as string[] | undefined);
    } catch {
      /* userinfo is optional */
    }
  }

  if (!email) throw new Error("no email claim from IdP");
  return { email, name, groups: Array.isArray(groups) ? groups : [], redirectAfter };
}
