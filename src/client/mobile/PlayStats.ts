// Local count of games started and finished, shown in About so playtesters
// can report it (there is no telemetry offline). Storage can be blocked or
// full; then nothing is counted and About hides the line.

const KEY = "wc.playStats";

export interface PlayStats {
  started: number;
  finished: number;
  first: number;
  last: number;
}

export function readPlayStats(): PlayStats | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const s = JSON.parse(raw) as Partial<PlayStats>;
    return {
      started: Number(s.started) || 0,
      finished: Number(s.finished) || 0,
      first: Number(s.first) || 0,
      last: Number(s.last) || 0,
    };
  } catch {
    return null;
  }
}

function bump(field: "started" | "finished"): void {
  try {
    const now = Date.now();
    const s = readPlayStats() ?? {
      started: 0,
      finished: 0,
      first: now,
      last: now,
    };
    s[field]++;
    s.last = now;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Blocked or full storage: the count is best-effort.
  }
}

export const gameStarted = () => bump("started");
export const gameFinished = () => bump("finished");
