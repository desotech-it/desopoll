// Reusable game WebSocket hook. Opens the socket for a session, feeds incoming
// messages through the PURE reducer (src/game/reducer.ts), exposes the reduced
// snapshot + a typed send(), auto-reconnects on drop (bounded, backing off), and
// pings periodically.
//
// The message-reducing logic lives in reducer.ts so it can be unit-tested with
// no real socket; this file only handles transport + React glue.
//
// IMPORTANT (issue #7 latency/robustness):
// - The connecting effect depends ONLY on [sessionId] (stable for the screen's
//   life), so the socket is created ONCE and is NOT torn down on re-render.
// - Every incoming frame is dispatched into the reducer IMMEDIATELY — there is
//   no debounce/throttle/polling gating event delivery.
// - Reconnect is robust to MULTIPLE drops: the attempt counter resets on every
//   successful open, so a second/third disconnect still reconnects (the old code
//   reconnected at most once for the whole screen lifetime).
import { useCallback, useEffect, useReducer, useRef } from "react";
import { reduce } from "./game/reducer";
import {
  type ClientMessage,
  type GameSnapshot,
  type ServerEvent,
  initialSnapshot,
} from "./game/types";

const PING_INTERVAL_MS = 20000;
const RECONNECT_BASE_MS = 800;
const RECONNECT_MAX_MS = 8000;
const MAX_RECONNECT_ATTEMPTS = 20;

export function wsUrl(sessionId: string): string {
  const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
  const host = typeof location !== "undefined" ? location.host : "localhost";
  return `${proto}://${host}/ws?session=${encodeURIComponent(sessionId)}`;
}

// Capped exponential backoff for reconnect attempt N (0-based).
function reconnectDelay(attempt: number): number {
  return Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt);
}

function parseEvent(raw: string): ServerEvent | null {
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && typeof data.type === "string") {
      return data as ServerEvent;
    }
  } catch {
    /* ignore malformed frames */
  }
  return null;
}

export interface GameSocket {
  snapshot: GameSnapshot;
  send: (msg: ClientMessage) => void;
  connected: boolean;
}

export function useGameSocket(sessionId: string | null): GameSocket {
  const [snapshot, dispatch] = useReducer(reduce, initialSnapshot);
  // Live mirror of the game state so onclose can decide whether to reconnect without
  // re-subscribing the effect (which must stay keyed only on sessionId).
  const stateRef = useRef(snapshot.state);
  stateRef.current = snapshot.state;
  const socketRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const timersRef = useRef<{ ping?: number; reconnect?: number }>({});
  const closedByUsRef = useRef(false);

  const send = useCallback((msg: ClientMessage) => {
    const sock = socketRef.current;
    if (sock && sock.readyState === WebSocket.OPEN) {
      sock.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    closedByUsRef.current = false;
    attemptsRef.current = 0;

    function clearPing() {
      if (timersRef.current.ping) window.clearInterval(timersRef.current.ping);
      timersRef.current.ping = undefined;
    }

    function clearTimers() {
      clearPing();
      if (timersRef.current.reconnect) window.clearTimeout(timersRef.current.reconnect);
      timersRef.current.reconnect = undefined;
    }

    function open() {
      const sock = new WebSocket(wsUrl(sessionId!));
      socketRef.current = sock;

      sock.onopen = () => {
        // Successful connection: reset the backoff so later drops still reconnect.
        attemptsRef.current = 0;
        dispatch({ type: "open" });
        clearPing();
        timersRef.current.ping = window.setInterval(() => {
          if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "ping" }));
        }, PING_INTERVAL_MS);
      };

      // Dispatch each parsed frame IMMEDIATELY — no throttle/debounce/polling.
      sock.onmessage = (ev) => {
        const parsed = parseEvent(typeof ev.data === "string" ? ev.data : "");
        if (parsed) dispatch(parsed);
      };

      sock.onclose = () => {
        if (socketRef.current === sock) socketRef.current = null;
        dispatch({ type: "close" });
        clearPing();
        // Auto-reconnect (bounded) unless we closed it deliberately or the game is over
        // (no point reconnecting after ended/aborted — and it avoids post-game churn).
        if (closedByUsRef.current || attemptsRef.current >= MAX_RECONNECT_ATTEMPTS) return;
        if (stateRef.current === "ended" || stateRef.current === "aborted") return;
        const delay = reconnectDelay(attemptsRef.current);
        attemptsRef.current += 1;
        timersRef.current.reconnect = window.setTimeout(() => {
          if (!closedByUsRef.current) open();
        }, delay);
      };

      sock.onerror = () => {
        // Let onclose handle reconnect.
        sock.close();
      };
    }

    open();

    return () => {
      closedByUsRef.current = true;
      clearTimers();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [sessionId]);

  return { snapshot, send, connected: snapshot.connected };
}
