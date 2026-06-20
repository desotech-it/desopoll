import { Redis } from "ioredis";

// Three connections: a general client (commands), plus dedicated pub/sub
// connections (ioredis requires a separate connection once it enters subscriber mode).
let client: Redis | null = null;
let publisher: Redis | null = null;
let subscriber: Redis | null = null;

export function initRedis(redisUrl: string): void {
  const opts = { maxRetriesPerRequest: null as null, lazyConnect: false };
  client = new Redis(redisUrl, opts);
  publisher = new Redis(redisUrl, opts);
  subscriber = new Redis(redisUrl, opts);
  for (const [name, conn] of [["client", client], ["pub", publisher], ["sub", subscriber]] as const) {
    conn.on("error", (err) => console.error(`[redis:${name}] ${err.message}`));
  }
}

export function redis(): Redis {
  if (!client) throw new Error("Redis not initialized — call initRedis() first");
  return client;
}

export function redisPub(): Redis {
  if (!publisher) throw new Error("Redis not initialized — call initRedis() first");
  return publisher;
}

export function redisSub(): Redis {
  if (!subscriber) throw new Error("Redis not initialized — call initRedis() first");
  return subscriber;
}

export async function closeRedis(): Promise<void> {
  await Promise.all([client?.quit(), publisher?.quit(), subscriber?.quit()].map((p) => p?.catch(() => {})));
  client = publisher = subscriber = null;
}
