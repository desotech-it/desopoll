import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mocks: in-memory Redis + an instrumentable Postgres ----------------------------
// store.ts calls redis().get/set/del; engine.ts calls db().query. We replace both with
// fakes so the engine's logic (locking, scoring, publish ordering, deferred persistence)
// can be exercised without real infrastructure.

const kv = new Map<string, string>();
const redisMock = {
  get: vi.fn(async (k: string) => kv.get(k) ?? null),
  set: vi.fn(async (k: string, v: string) => {
    kv.set(k, v);
    return "OK";
  }),
  del: vi.fn(async (k: string) => {
    kv.delete(k);
    return 1;
  }),
};

// Postgres: record every query; each call resolves after `dbDelayMs` so tests can prove
// that durable writes happen OFF the lock's critical path (publishes don't wait on them).
let dbDelayMs = 0;
const dbCalls: { sql: string; params: unknown[] }[] = [];
const dbResolvers: Array<() => void> = [];
const dbMock = {
  query: vi.fn((sql: string, params: unknown[] = []) => {
    dbCalls.push({ sql, params });
    if (dbDelayMs < 0) {
      // manual mode: caller releases via flushDb()
      return new Promise((resolve) => dbResolvers.push(() => resolve({ rows: [] })));
    }
    return new Promise((resolve) => setTimeout(() => resolve({ rows: [] }), dbDelayMs));
  }),
};

vi.mock("../src/redis.js", () => ({ redis: () => redisMock }));
vi.mock("../src/db.js", () => ({ db: () => dbMock }));

import { submitAnswer, hostAction } from "../src/game/engine.js";
import { saveRuntime, loadRuntime } from "../src/game/store.js";
import type { RuntimeSession } from "../src/game/runtime.js";
import type { RealtimeTransport, RealtimeHandler } from "../src/realtime.js";

// Records publishes synchronously and (like the real RedisRealtime) dispatches locally.
function fakeTransport() {
  const events: Array<{ channel: string; event: any }> = [];
  const handlers = new Map<string, Set<RealtimeHandler>>();
  const transport: RealtimeTransport = {
    async publish(channel, event) {
      events.push({ channel, event });
      handlers.get(channel)?.forEach((h) => h(event));
    },
    async subscribe(channel, handler) {
      const set = handlers.get(channel) ?? new Set();
      set.add(handler);
      handlers.set(channel, set);
      return async () => {
        set.delete(handler);
      };
    },
    async close() {},
  };
  return { transport, events };
}

const HOST = "host-1";

function seedRuntime(over: Partial<RuntimeSession> = {}): RuntimeSession {
  const rt: RuntimeSession = {
    id: "sess-1",
    quizId: "quiz-1",
    hostId: HOST,
    pin: "123456",
    language: "it",
    title: "T",
    state: "lobby",
    currentIndex: -1,
    questionStartedAt: null,
    questions: [
      {
        id: "q1",
        index: 0,
        type: "single_choice",
        prompt: "?",
        image: null,
        timeLimitSec: 20,
        pointsMode: "standard",
        speedBonus: false,
        answerSpec: { options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correct: ["a"] } as never,
        options: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
      },
    ],
    players: {
      p1: { id: "p1", nickname: "Ada", score: 0 },
      p2: { id: "p2", nickname: "Bo", score: 0 },
    },
    answers: {},
    ...over,
  };
  return rt;
}

beforeEach(() => {
  kv.clear();
  dbCalls.length = 0;
  dbResolvers.length = 0;
  dbDelayMs = 0;
  vi.clearAllMocks();
});

const flushDb = () => {
  while (dbResolvers.length) dbResolvers.shift()!();
};

describe("submitAnswer", () => {
  it("scores a correct answer once and publishes 'answered'", async () => {
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    const res = await submitAnswer(transport, "sess-1", "p1", { optionId: "a" } as never);
    expect(res).toEqual({ ok: true });

    const after = await loadRuntime("sess-1");
    expect(after!.players.p1.score).toBeGreaterThan(0);
    expect(after!.answers[0]?.p1?.correct).toBe(true);
    const answered = events.find((e) => e.event.type === "answered");
    expect(answered?.event).toMatchObject({ count: 1, total: 2 });
  });

  it("first-answer-wins: a duplicate from the same player is ignored, no double-scoring", async () => {
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport } = fakeTransport();

    await submitAnswer(transport, "sess-1", "p1", { optionId: "a" } as never);
    const firstScore = (await loadRuntime("sess-1"))!.players.p1.score;

    // Second submission (even a different choice) must be a no-op for scoring/persistence.
    const dbCallsBefore = dbCalls.length;
    const res2 = await submitAnswer(transport, "sess-1", "p1", { optionId: "b" } as never);
    expect(res2).toEqual({ ok: true });

    const after = await loadRuntime("sess-1");
    expect(after!.players.p1.score).toBe(firstScore); // unchanged
    expect(after!.answers[0]?.p1?.correct).toBe(true); // still the original correct answer
    expect(dbCalls.length).toBe(dbCallsBefore); // no extra INSERT/UPDATE for the dup
  });

  it("rejects answers when the question is not active", async () => {
    const rt = seedRuntime({ state: "question_results", currentIndex: 0 });
    await saveRuntime(rt);
    const { transport } = fakeTransport();
    const res = await submitAnswer(transport, "sess-1", "p1", { optionId: "a" } as never);
    expect(res).toEqual({ error: "not accepting answers" });
  });

  it("publishes 'answered' and resolves WITHOUT waiting for the durable answer writes", async () => {
    dbDelayMs = -1; // DB queries hang until flushDb() — they must NOT be awaited
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    // If the answer INSERT / score UPDATE were on the critical path, this await would
    // hang on the never-resolving DB. It resolves because those writes are deferred.
    const res = await submitAnswer(transport, "sess-1", "p1", { optionId: "a" } as never);
    expect(res).toEqual({ ok: true });
    expect(events.some((e) => e.event.type === "answered")).toBe(true);
    expect(dbCalls.length).toBeGreaterThanOrEqual(1); // writes were issued (still pending)
    flushDb();
  });

  it("durable answer writes do not block a subsequent host action", async () => {
    dbDelayMs = -1; // DB hangs
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    // The answer resolves even though its DB writes are stuck pending.
    await submitAnswer(transport, "sess-1", "p1", { optionId: "a" } as never);
    // The host can then lock and players get 'results' — not stuck behind the answer's DB.
    const res = await hostAction(transport, "sess-1", HOST, "lock");
    expect(res).toEqual({ ok: true });
    expect(events.some((e) => e.event.type === "results")).toBe(true);

    flushDb();
  });
});

describe("hostAction", () => {
  it("start: publishes 'question' first, then 'state'", async () => {
    const rt = seedRuntime({ state: "lobby", currentIndex: -1 });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    const res = await hostAction(transport, "sess-1", HOST, "start");
    expect(res).toEqual({ ok: true });
    const types = events.map((e) => e.event.type);
    expect(types[0]).toBe("question");
    expect(types).toContain("state");
    expect(events[0].event.question.index).toBe(0);
  });

  it("lock: publishes 'results' (the 'show results' event) then 'state'", async () => {
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    const res = await hostAction(transport, "sess-1", HOST, "lock");
    expect(res).toEqual({ ok: true });
    const types = events.map((e) => e.event.type);
    expect(types[0]).toBe("results");
    expect(types).toContain("state");
    const results = events.find((e) => e.event.type === "results")!.event;
    expect(results.results).toBeTruthy();
    expect(results).toHaveProperty("personalById");
  });

  it("lock publishes 'results' and resolves WITHOUT waiting for the game_sessions UPDATE", async () => {
    dbDelayMs = -1; // persistState hangs — it must be off the critical path
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    const res = await hostAction(transport, "sess-1", HOST, "lock");
    expect(res).toEqual({ ok: true });
    // Players already received 'results' while the Postgres UPDATE is still pending.
    expect(events.some((e) => e.event.type === "results")).toBe(true);
    flushDb();
  });

  it("rejects a non-host", async () => {
    const rt = seedRuntime({ state: "question_active", currentIndex: 0, questionStartedAt: Date.now() });
    await saveRuntime(rt);
    const { transport } = fakeTransport();
    const res = await hostAction(transport, "sess-1", "intruder", "lock");
    expect(res).toEqual({ error: "not the host" });
  });

  it("rejects an illegal transition", async () => {
    const rt = seedRuntime({ state: "lobby", currentIndex: -1 });
    await saveRuntime(rt);
    const { transport } = fakeTransport();
    const res = await hostAction(transport, "sess-1", HOST, "lock");
    expect(res).toEqual({ error: "cannot lock from lobby" });
  });

  it("end from podium publishes 'ended', tears down the runtime", async () => {
    const rt = seedRuntime({ state: "podium", currentIndex: 0 });
    await saveRuntime(rt);
    const { transport, events } = fakeTransport();

    const res = await hostAction(transport, "sess-1", HOST, "end");
    expect(res).toEqual({ ok: true });
    expect(events[0].event.type).toBe("ended");
    expect(await loadRuntime("sess-1")).toBeNull(); // runtime deleted
  });
});
