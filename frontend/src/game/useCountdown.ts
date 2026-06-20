// Countdown hook: given the active question's timeLimitSec and the server's
// reference time, returns the remaining whole seconds, ticking once per second.
// Uses the client clock for the tick; the server time only anchors the start so
// host and players stay roughly in sync.
import { useEffect, useState } from "react";

export function useCountdown(
  timeLimitSec: number | null | undefined,
  questionServerTime: number | null | undefined,
): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timeLimitSec || !questionServerTime) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timeLimitSec, questionServerTime]);

  if (!timeLimitSec || !questionServerTime) return null;
  const elapsed = (now - questionServerTime) / 1000;
  const remaining = Math.ceil(timeLimitSec - elapsed);
  return Math.max(0, Math.min(timeLimitSec, remaining));
}
