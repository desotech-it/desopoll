// Tests for the game WebSocket hook transport glue (issue #7 robustness):
// - the socket is created ONCE per sessionId (no churn on re-render),
// - incoming frames are dispatched into the reducer IMMEDIATELY,
// - reconnect survives MULTIPLE drops (the old code reconnected at most once),
// - a deliberate unmount does NOT reconnect.
//
// A tiny fake WebSocket records every instance so we can assert the count and
// drive open/message/close manually with fake timers for the backoff.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameSocket, wsUrl } from "./ws";

class FakeWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = 0;
  url: string;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
  // ---- test drivers ----
  fireOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  fireMessage(obj: unknown) {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }
  fireServerClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.();
  }
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("wsUrl", () => {
  it("builds a ws(s) url against the current host with the session query", () => {
    expect(wsUrl("abc")).toContain("/ws?session=abc");
    expect(wsUrl("a b")).toContain("session=a%20b"); // url-encoded
  });
});

describe("useGameSocket — single socket, no churn", () => {
  it("creates exactly one socket and reuses it across re-renders", () => {
    const { rerender } = renderHook(({ id }) => useGameSocket(id), {
      initialProps: { id: "s1" as string | null },
    });
    act(() => FakeWebSocket.instances[0].fireOpen());
    rerender({ id: "s1" });
    rerender({ id: "s1" });
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe("useGameSocket — immediate event delivery", () => {
  it("applies incoming events to the snapshot with no debounce/throttle", () => {
    const { result } = renderHook(() => useGameSocket("s1"));
    act(() => FakeWebSocket.instances[0].fireOpen());
    expect(result.current.connected).toBe(true);
    act(() =>
      FakeWebSocket.instances[0].fireMessage({
        type: "hello",
        title: "Quiz",
        state: "lobby",
        currentIndex: 0,
        total: 3,
      }),
    );
    expect(result.current.snapshot.title).toBe("Quiz");
    expect(result.current.snapshot.total).toBe(3);
    // The very next frame is reflected immediately too.
    act(() => FakeWebSocket.instances[0].fireMessage({ type: "answered", count: 2, total: 5 }));
    expect(result.current.snapshot.answeredCount).toBe(2);
  });
});

describe("useGameSocket — reconnect survives multiple drops", () => {
  it("reconnects again after a SECOND unexpected close (old bug: only once)", () => {
    const { result } = renderHook(() => useGameSocket("s1"));
    // 1st connection
    act(() => FakeWebSocket.instances[0].fireOpen());
    expect(result.current.connected).toBe(true);

    // 1st drop → reconnect after backoff
    act(() => FakeWebSocket.instances[0].fireServerClose());
    expect(result.current.connected).toBe(false);
    act(() => vi.advanceTimersByTime(10000));
    expect(FakeWebSocket.instances).toHaveLength(2);
    act(() => FakeWebSocket.instances[1].fireOpen());
    expect(result.current.connected).toBe(true);

    // 2nd drop → MUST reconnect again (this is the hardening fix)
    act(() => FakeWebSocket.instances[1].fireServerClose());
    act(() => vi.advanceTimersByTime(10000));
    expect(FakeWebSocket.instances).toHaveLength(3);
    act(() => FakeWebSocket.instances[2].fireOpen());
    expect(result.current.connected).toBe(true);
  });
});

describe("useGameSocket — deliberate close does not reconnect", () => {
  it("does not open a new socket after unmount", () => {
    const { unmount } = renderHook(() => useGameSocket("s1"));
    act(() => FakeWebSocket.instances[0].fireOpen());
    unmount();
    act(() => vi.advanceTimersByTime(10000));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
