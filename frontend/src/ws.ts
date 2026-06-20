// Reusable game WebSocket hook. Opens the socket for a session, feeds incoming
// messages through the PURE reducer (src/game/reducer.ts), exposes the reduced
// snapshot + a typed send(), auto-reconnects once on drop, and pings periodically.
//
// The message-reducing logic lives in reducer.ts so it can be unit-tested with
// no real socket; this file only handles transport + React glue.
import { useCallback, useEffect, useReducer, useRef } from "react";
import { reduce } from "./game/reducer";
import {
  type ClientMessage,
  type GameSnapshot,
  type ServerEvent,
  initialSnapshot,
} from "./game/types";

const PING_INTERVAL_MS = 20000;
const RECONNECT_DELAY_MS = 1500;

export function wsUrl(sessionId: string): string {
  const proto = typeof location !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
  const host = typeof location !== "undefined" ? location.host : "localhost";
  return `${proto}://${host}/ws?session=${encodeURIComponent(sessionId)}`;
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
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectedRef = useRef(false);
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
    reconnectedRef.current = false;

    function clearTimers() {
      if (timersRef.current.ping) window.clearInterval(timersRef.current.ping);
      if (timersRef.current.reconnect) window.clearTimeout(timersRef.current.reconnect);
      timersRef.current = {};
    }

    function open() {
      const sock = new WebSocket(wsUrl(sessionId!));
      socketRef.current = sock;

      sock.onopen = () => {
        dispatch({ type: "open" });
        timersRef.current.ping = window.setInterval(() => {
          if (sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({ type: "ping" }));
        }, PING_INTERVAL_MS);
      };

      sock.onmessage = (ev) => {
        const parsed = parseEvent(typeof ev.data === "string" ? ev.data : "");
        if (parsed) dispatch(parsed);
      };

      sock.onclose = () => {
        dispatch({ type: "close" });
        if (timersRef.current.ping) window.clearInterval(timersRef.current.ping);
        // Auto-reconnect exactly once if we didn't close it deliberately.
        if (!closedByUsRef.current && !reconnectedRef.current) {
          reconnectedRef.current = true;
          timersRef.current.reconnect = window.setTimeout(open, RECONNECT_DELAY_MS);
        }
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
