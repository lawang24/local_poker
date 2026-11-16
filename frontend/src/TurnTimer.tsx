import { useEffect, useState, type CSSProperties } from "react";
import type { State } from "./types";

export function TurnTimer({ state }: { state: State }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (state.paused) return;
    const start = performance.now();
    const timer = setInterval(() => setElapsed((performance.now() - start) / 1000), 100);
    return () => clearInterval(timer);
  }, [state.paused]);
  const remaining = Math.max(0, state.turn_deadline! - (state.paused_at ?? state.server_time) - elapsed);
  return <div className={`turn-timer ${remaining <= 5 ? "is-urgent" : ""}`}
    style={{ "--time-left": `${Math.min(100, remaining / state.turn_seconds * 100)}%` } as CSSProperties}
    aria-label={`Turn timer: ${Math.ceil(remaining)} seconds${state.paused ? ", paused" : ""}`}>
    <span>{state.paused ? "Paused · " : ""}{Math.ceil(remaining)}s</span>
  </div>;
}
