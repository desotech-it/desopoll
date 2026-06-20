import "dotenv/config";
import { loadEnv } from "./env.js";
import { initDb, closeDb } from "./db.js";
import { initRedis, redisPub, redisSub, closeRedis } from "./redis.js";
import { RedisRealtime } from "./realtime.js";
import { buildServer } from "./server.js";

async function main(): Promise<void> {
  const env = loadEnv();
  initDb(env.DATABASE_URL);
  initRedis(env.REDIS_URL);

  const realtime = new RedisRealtime(redisPub(), redisSub());
  const app = await buildServer(env, realtime);

  await app.listen({ host: "0.0.0.0", port: env.PORT });
  app.log.info(`desopoll-backend listening on :${env.PORT} (languages: ${env.languages.join(",")})`);

  const shutdown = async (signal: string) => {
    app.log.info(`received ${signal}, shutting down`);
    await app.close();
    await realtime.close();
    await closeRedis();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[desopoll-backend] fatal:", err);
  process.exit(1);
});
