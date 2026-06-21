import { randomUUID } from "node:crypto";
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

// Wire envelope: carries the publishing process's origin id so the Redis redelivery
// can be ignored for messages this pod already delivered to its local handlers.
interface Envelope {
  o: string; // origin process id
  e: unknown; // the actual event
}

export class RedisRealtime implements RealtimeTransport {
  private handlers = new Map<string, Set<RealtimeHandler>>();
  // Unique per backend process; lets us short-circuit same-pod delivery without
  // double-dispatching when Redis echoes our own publish back on the sub connection.
  private readonly origin = randomUUID();

  constructor(private pub: Redis, private sub: Redis) {
    this.sub.on("message", (channel, payload) => {
      const set = this.handlers.get(channel);
      if (!set || set.size === 0) return;
      let parsed: Envelope | null;
      try {
        parsed = JSON.parse(payload) as Envelope;
      } catch {
        parsed = null;
      }
      // We already delivered our own publishes synchronously in publish(); ignore the
      // echo so same-pod sockets don't receive the event twice.
      if (parsed && parsed.o === this.origin) return;
      const event = parsed ? parsed.e : payload;
      this.dispatch(set, event, channel);
    });
  }

  private dispatch(set: Set<RealtimeHandler>, event: unknown, channel: string): void {
    for (const h of set) {
      try {
        h(event);
      } catch (err) {
        console.error(`[realtime] handler error on ${channel}`, err);
      }
    }
  }

  async publish(channel: string, event: unknown): Promise<void> {
    // Deliver to same-pod sockets synchronously so they don't wait for a Redis
    // publish + pub/sub redelivery round-trip. Other pods still receive the event
    // via the Redis fan-out below; the origin tag on the envelope makes this pod
    // skip the echo so local sockets are not notified twice.
    const set = this.handlers.get(channel);
    if (set && set.size > 0) this.dispatch(set, event, channel);
    const payload = JSON.stringify({ o: this.origin, e: event } satisfies Envelope);
    await this.pub.publish(channel, payload);
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
