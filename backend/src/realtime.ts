import type { Redis } from "ioredis";

// Substitutable real-time layer. Game logic depends ONLY on this interface, never on
// a concrete transport. Today: Redis pub/sub fan-out across WebSocket server pods so a
// player connected to any pod receives every game event. The same interface can be
// backed by an in-memory bus (single-pod/tests) or another broker without touching
// game logic.
export type RealtimeHandler = (event: unknown) => void;

export interface RealtimeTransport {
  publish(channel: string, event: unknown): Promise<void>;
  subscribe(channel: string, handler: RealtimeHandler): Promise<() => Promise<void>>;
  close(): Promise<void>;
}

export class RedisRealtime implements RealtimeTransport {
  private handlers = new Map<string, Set<RealtimeHandler>>();

  constructor(private pub: Redis, private sub: Redis) {
    this.sub.on("message", (channel, payload) => {
      const set = this.handlers.get(channel);
      if (!set || set.size === 0) return;
      let event: unknown;
      try {
        event = JSON.parse(payload);
      } catch {
        event = payload;
      }
      for (const h of set) {
        try {
          h(event);
        } catch (err) {
          console.error(`[realtime] handler error on ${channel}`, err);
        }
      }
    });
  }

  async publish(channel: string, event: unknown): Promise<void> {
    await this.pub.publish(channel, JSON.stringify(event));
  }

  async subscribe(channel: string, handler: RealtimeHandler): Promise<() => Promise<void>> {
    let set = this.handlers.get(channel);
    if (!set) {
      set = new Set();
      this.handlers.set(channel, set);
      await this.sub.subscribe(channel);
    }
    set.add(handler);

    return async () => {
      const current = this.handlers.get(channel);
      if (!current) return;
      current.delete(handler);
      if (current.size === 0) {
        this.handlers.delete(channel);
        await this.sub.unsubscribe(channel).catch(() => {});
      }
    };
  }

  async close(): Promise<void> {
    this.handlers.clear();
  }
}

// Channel naming: one channel per live game session.
export const sessionChannel = (sessionId: string): string => `desopoll:session:${sessionId}`;
