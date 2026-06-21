import { describe, it, expect, vi } from "vitest";
import { RedisRealtime, sessionChannel } from "../src/realtime.js";

// Minimal fake ioredis pair: `pub` records publishes; `sub` exposes the registered
// "message" callback so a test can feed frames back as Redis would (including echoing
// the pod's own publish to its subscriber).
function fakeRedisPair() {
  let onMessage: ((channel: string, payload: string) => void) | null = null;
  const published: { channel: string; payload: string }[] = [];
  const pub = {
    publish: vi.fn(async (channel: string, payload: string) => {
      published.push({ channel, payload });
      return 1;
    }),
  };
  const sub = {
    on: (event: string, cb: (channel: string, payload: string) => void) => {
      if (event === "message") onMessage = cb;
    },
    subscribe: vi.fn(async () => undefined),
    unsubscribe: vi.fn(async () => undefined),
  };
  const deliver = (channel: string, payload: string) => onMessage?.(channel, payload);
  const echoLast = () => {
    const last = published[published.length - 1];
    if (last) deliver(last.channel, last.payload);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { pub: pub as any, sub: sub as any, published, deliver, echoLast };
}

const CH = sessionChannel("s1");

describe("RedisRealtime local short-circuit", () => {
  it("delivers to same-pod handlers synchronously, before the Redis publish resolves", async () => {
    const { pub, sub } = fakeRedisPair();
    const rt = new RedisRealtime(pub, sub);
    const received: unknown[] = [];
    await rt.subscribe(CH, (e) => received.push(e));

    const p = rt.publish(CH, { type: "question", n: 1 });
    // Handler must have fired synchronously during publish(), before awaiting it.
    expect(received).toEqual([{ type: "question", n: 1 }]);
    await p;
    expect(pub.publish).toHaveBeenCalledTimes(1);
  });

  it("does NOT double-deliver when Redis echoes our own publish back on the sub", async () => {
    const { pub, sub, echoLast } = fakeRedisPair();
    const rt = new RedisRealtime(pub, sub);
    const received: unknown[] = [];
    await rt.subscribe(CH, (e) => received.push(e));

    await rt.publish(CH, { type: "results", x: 1 });
    echoLast(); // Redis bounces our own message back to this pod's subscriber
    expect(received).toEqual([{ type: "results", x: 1 }]);
    void pub;
  });

  it("delivers a frame that originated on another pod (foreign origin tag)", async () => {
    const { pub, sub, deliver } = fakeRedisPair();
    const rt = new RedisRealtime(pub, sub);
    const received: unknown[] = [];
    await rt.subscribe(CH, (e) => received.push(e));

    const foreign = JSON.stringify({ o: "other-pod", e: { type: "podium", top: 3 } });
    deliver(CH, foreign);
    expect(received).toEqual([{ type: "podium", top: 3 }]);
    void pub;
  });

  it("wraps the event in an envelope on the wire (so other pods can de-dupe by origin)", async () => {
    const { pub, sub, published } = fakeRedisPair();
    const rt = new RedisRealtime(pub, sub);
    await rt.publish(CH, { type: "answered", count: 2 });
    const sent = JSON.parse(published[0].payload) as { o: string; e: unknown };
    expect(typeof sent.o).toBe("string");
    expect(sent.e).toEqual({ type: "answered", count: 2 });
    void sub;
  });

  it("stops delivering after unsubscribe", async () => {
    const { pub, sub, echoLast } = fakeRedisPair();
    const rt = new RedisRealtime(pub, sub);
    const received: unknown[] = [];
    const off = await rt.subscribe(CH, (e) => received.push(e));
    await off();
    await rt.publish(CH, { type: "question", n: 9 });
    echoLast();
    expect(received).toEqual([]);
    void pub;
  });
});
