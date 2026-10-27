// Aftergame recap: what the game came to, and one comparison line against the
// player's own earlier games on the same map, only when it is true. Records
// live in localStorage (best per map, since this feature shipped); storage can
// be blocked or full, then the recap shows its numbers and no comparison.
// Known ceiling: peak land restarts when a game is resumed after a restart.
import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import type { GameView } from "../view";

const KEY = "wc.best";
const KEEP_MAPS = 40;

interface MapBest {
  games: number;
  /** Games won; absent in records from before it was counted. */
  wins?: number;
  /** Fastest win, seconds. */
  win?: number;
  /** Longest game, seconds. */
  longest: number;
  /** Most land held, whole percent. */
  peak: number;
}
type Bests = Record<string, MapBest>;

export interface RecapNote {
  /** An `mobile.recap_*` key. */
  key: string;
  params: Record<string, string | number>;
}

export interface Recap {
  seconds: number;
  peak: number;
  /** Nations no longer alive, out of all nations in the game. */
  out: number;
  total: number;
  note: RecapNote | null;
}

let peakGame: string | null = null;
let peakLand = 0;

/** Called as the game runs: keeps the most land held (whole percent). */
export function notePeakLand(gameID: string, percent: number): void {
  if (peakGame !== gameID) {
    peakGame = gameID;
    peakLand = 0;
  }
  peakLand = Math.max(peakLand, Math.round(percent));
}

function readBests(): Bests {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Bests;
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Nations (not tribes, not the player) that are out, of all there were. */
export function rivalCount(game: GameView): { out: number; total: number } {
  const me = game.myPlayer();
  const rivals = game
    .players()
    .filter((p) => p !== me && p.type() !== PlayerType.Bot);
  return {
    out: rivals.filter((p) => !p.isAlive()).length,
    total: rivals.length,
  };
}

/**
 * Builds the recap for a finished game and records it. `map` keys the bests;
 * `mapName` is what the player reads. Call once per game: it updates the bests.
 */
export function recordGame(
  game: {
    id: string;
    map: string;
    mapName: string;
    seconds: number;
    won: boolean;
    land: number;
  },
  rivals: { out: number; total: number },
): Recap {
  const peak = Math.max(peakGame === game.id ? peakLand : 0, game.land);
  const bests = readBests();
  const prior = bests[game.map];
  const params = { map: game.mapName };
  let note: RecapNote | null = null;
  if (game.won) {
    if (prior?.win === undefined)
      note = { key: "mobile.recap_first_win", params };
    else if (game.seconds < prior.win) {
      note = { key: "mobile.recap_fastest_win", params };
    }
  } else if (prior !== undefined) {
    if (game.seconds > prior.longest) {
      note = { key: "mobile.recap_longest", params };
    } else if (peak > prior.peak) {
      note = {
        key: "mobile.recap_most_land",
        params: { ...params, percent: peak },
      };
    }
  }
  try {
    bests[game.map] = {
      games: (prior?.games ?? 0) + 1,
      wins: winsOn(prior) + (game.won ? 1 : 0),
      win: game.won
        ? Math.min(prior?.win ?? Infinity, game.seconds)
        : prior?.win,
      longest: Math.max(prior?.longest ?? 0, game.seconds),
      peak: Math.max(prior?.peak ?? 0, peak),
    };
    const kept = Object.entries(bests).slice(-KEEP_MAPS);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    // Blocked or full storage: no comparison next time.
  }
  return { seconds: game.seconds, peak, ...rivals, note };
}

/** Wins on a map; an old record with a win time counts as one. */
function winsOn(b: MapBest | undefined): number {
  return b?.wins ?? (b?.win !== undefined ? 1 : 0);
}

export interface CommanderRecord {
  wins: number;
  /** Fastest win on any map, seconds. */
  best?: number;
  /** Map (GameMapType value) → won there at least once. */
  won: Set<string>;
  /** An earned title (`mobile.title_*` key and params), or null. */
  title: RecapNote | null;
}

/**
 * The home screen's record, from the per-map bests; null before the first
 * finished game. `maps` are the curated map types (the medals),
 * `dailyStreak` the current daily streak. Titles are earned, highest first.
 */
export function commanderRecord(
  maps: readonly string[],
  dailyStreak: number,
): CommanderRecord | null {
  const entries = Object.entries(readBests());
  if (entries.length === 0) return null;
  let wins = 0;
  let best: number | undefined;
  let top: [string, number] = ["", 0];
  const won = new Set<string>();
  for (const [map, b] of entries) {
    const w = winsOn(b);
    wins += w;
    if (w > 0) won.add(map);
    if (b.win !== undefined) best = Math.min(best ?? Infinity, b.win);
    if (w > top[1]) top = [map, w];
  }
  let title: RecapNote | null = null;
  if (maps.length > 0 && maps.every((m) => won.has(m))) {
    title = { key: "mobile.title_conqueror", params: {} };
  } else if (top[1] >= 3) {
    title = { key: "mobile.title_warlord", params: { map: top[0] } };
  } else if (dailyStreak >= 7) {
    title = { key: "mobile.title_unbroken", params: {} };
  } else if (wins > 0) {
    title = { key: "mobile.title_victor", params: {} };
  }
  return { wins, best, won, title };
}

/** m:ss, for a game length. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Test-only. */
export function resetRecapForTests(): void {
  peakGame = null;
  peakLand = 0;
}
