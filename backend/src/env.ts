import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default("*"),
  SUPPORTED_LANGUAGES: z.string().default("it,en,es"),
  DEFAULT_LANGUAGE: z.string().default("it"),

  // Public base URL of the app (used to build the OIDC redirect URI and post-login redirects).
  APP_BASE_URL: z.string().default("http://localhost:8080"),
  // Secret used to sign session cookies.
  SESSION_SECRET: z.string().default("dev-insecure-session-secret-change-me"),

  // OIDC SSO (Authentik). SSO is active only when issuer + client id + secret are all set.
  OIDC_ISSUER: z.string().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_REDIRECT_URI: z.string().optional(),
  OIDC_SCOPES: z.string().default("openid email profile"),
  OIDC_GROUPS_CLAIM: z.string().default("groups"),
  // Users in this IdP group become desopoll admins.
  OIDC_ADMIN_GROUP: z.string().optional(),
});

export type Env = z.infer<typeof schema> & {
  languages: string[];
  oidcEnabled: boolean;
  oidcRedirectUri: string;
};

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;
  const oidcEnabled = Boolean(e.OIDC_ISSUER && e.OIDC_CLIENT_ID && e.OIDC_CLIENT_SECRET);
  return {
    ...e,
    languages: e.SUPPORTED_LANGUAGES.split(",").map((s) => s.trim()).filter(Boolean),
    oidcEnabled,
    oidcRedirectUri: e.OIDC_REDIRECT_URI || `${e.APP_BASE_URL.replace(/\/$/, "")}/api/auth/callback`,
  };
}
