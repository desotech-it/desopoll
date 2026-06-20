// sessionStorage persistence so a player who refreshes rejoins the same game
// without re-entering the PIN/nickname.
export interface JoinedSession {
  sessionId: string;
  playerId: string;
  nickname: string;
}

const KEY = "desopoll.join";

export function saveJoinedSession(s: JoinedSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable */
  }
}

export function loadJoinedSession(): JoinedSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.sessionId === "string" && typeof v.nickname === "string") {
      return v as JoinedSession;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearJoinedSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
