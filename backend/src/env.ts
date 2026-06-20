import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8080),
  // PostgreSQL — injected as a Secret in-cluster, or from a local dev DB.
  DATABASE_URL: z.string().min(1),
  // Redis (our own instance in the desopoll namespace) — volatile game state + pub/sub.
  REDIS_URL: z.string().min(1),
  // Comma-separated list of allowed CORS origins ("*" to allow all in dev).
  CORS_ORIGINS: z.string().default("*"),
  // Supported content/UI languages.
  SUPPORTED_LANGUAGES: z.string().default("it,en,es"),
  DEFAULT_LANGUAGE: z.string().default("it"),
});

export type Env = z.infer<typeof schema> & { languages: string[] };

export function loadEnv(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return {
    ...parsed.data,
    languages: parsed.data.SUPPORTED_LANGUAGES.split(",").map((s) => s.trim()).filter(Boolean),
  };
}
