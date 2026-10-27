// Local count of games started and finished, shown in About so playtesters
// can report it. Game ends also go to the opt-in usage stats (Analytics.ts).
// Storage can be blocked or full; then nothing is counted and About hides
// the lines.
import { track } from "./Analytics";

const KEY = "wc.playStats";
const KEEP_GAMES = 20;
const MEDIAN_MIN_GAMES = 3;
const MEDIAN_FINAL_GAMES = 10;

/** How a game ended. Only win and loss count as finished. */
export type EndReason = "win" | "loss" | "quit" | "abandoned";

export interface PlayedGame {
  /** Total game time in seconds, across resumes. */
  seconds: number;
  reason: EndReason;
}

export interface PlayStats {
  started: number;
  finished: number;
  first: number;
  last: number;
  /** The last KEEP_GAMES ended games, oldest first. */
  games: PlayedGame[];
}

const REASONS: readonly EndReason[] = ["win", "loss", "quit", "abandoned"];

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
      games: Array.isArray(s.games)
        ? s.games.filter(
            (g) => REASONS.includes(g?.reason) && Number.isFinite(g?.seconds),
          )
        : [],
    };
  } catch {
    return null;
  }
}

function update(change: (s: PlayStats) => void): void {
  try {
    const now = Date.now();
    const s = readPlayStats() ?? {
      started: 0,
      finished: 0,
      first: now,
      last: now,
      games: [],
    };
    change(s);
    s.last = now;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Blocked or full storage: the count is best-effort.
  }
}

/** A new game began. A resumed game does not call this. */
export const gameStarted = () =>
  update((s) => {
    s.started++;
    // The playtest gate's second game: once per install, at the second start.
    if (s.started === 2) track("second_game");
  });

/** A game ended for `reason` after `seconds` of game time in total. */
export const gameEnded = (
  reason: EndReason,
  seconds: number,
  /** Whole percent of the land held at the end, when known. */
  landPct?: number,
) => {
  track("game_end", {
    reason,
    minutes: Math.round(seconds / 60),
    ...(landPct === undefined ? {} : { land: landPct }),
  });
  update((s) => {
    if (reason === "win" || reason === "loss") s.finished++;
    s.games.push({ seconds: Math.max(0, Math.round(seconds)), reason });
    if (s.games.length > KEEP_GAMES)
      s.games.splice(0, s.games.length - KEEP_GAMES);
  });
};

/**
 * Median length in minutes of the won or lost games among the last 20, for
 * the About line. Null below 3 such games; provisional below 10.
 */
export function medianGame(
  stats: PlayStats,
): { minutes: number; provisional: boolean } | null {
  const lengths = stats.games
    .filter((g) => g.reason === "win" || g.reason === "loss")
    .map((g) => g.seconds)
    .sort((a, b) => a - b);
  if (lengths.length < MEDIAN_MIN_GAMES) return null;
  const mid = lengths.length >> 1;
  const median =
    lengths.length % 2 ? lengths[mid] : (lengths[mid - 1] + lengths[mid]) / 2;
  return {
    minutes: Math.round(median / 60),
    provisional: lengths.length < MEDIAN_FINAL_GAMES,
  };
}
