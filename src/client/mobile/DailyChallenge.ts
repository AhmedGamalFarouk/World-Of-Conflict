// Daily challenge: one fixed game per UTC day, the same for every player. The
// engine seeds its PRNG from the game ID, so an ID derived from the date pins
// the whole game (spawns, bots, nations). Map, difficulty and bots are derived
// from the date too. Results live in localStorage (and go to the opt-in usage
// stats); the streak counts consecutive days with a finished game, forgiving
// one missed day a week.
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  maps,
} from "@openfront/engine-api/game/GameTypes";
import type { GameConfig } from "@openfront/engine-api/Schemas";
import { simpleHash } from "@openfront/engine-lib/Util";
import { ReplaySpeedMultiplier } from "../utilities/ReplaySpeedMultiplier";
import { track } from "./Analytics";
import { rememberSoloConfig, requestSoloReplay } from "./SoloReplay";

// Mid-size curated maps: World, Europe, EuropeClassic and Mars are left out so
// a daily game stays playable on a 4 GB phone.
export const DAILY_MAP_IDS = [
  "Pangaea",
  "Italia",
  "BlackSea",
  "Baltics",
  "Oceania",
  "Mena",
  "Caucasus",
  "BosphorusStraits",
  "Germany",
  "Benelux",
  "Australia",
] as const;

export const DAILY_BOTS = 10;
const KEY = "wc.daily";
const KEEP_DAYS = 60;
const DAY_MS = 86_400_000;

export type DailyResult = "win" | "loss";
export interface DailyDay {
  result: DailyResult;
  seconds: number;
  /** Fastest win that day, seconds (replays of the day count). */
  best?: number;
}
type DailyDays = Record<string, DailyDay>;

/** "D20261026": 9 characters, valid as a game ID. */
export const dailyId = (now: Date = new Date()): string =>
  "D" + now.toISOString().slice(0, 10).replace(/-/g, "");

const DAILY_ID = /^D(\d{4})(\d{2})(\d{2})$/;
export const isDailyId = (id: string): boolean => DAILY_ID.test(id);

function idToDay(id: string): string {
  return id.slice(1).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
}

export function dailyConfig(id: string): GameConfig {
  const mapId = DAILY_MAP_IDS[simpleHash(id) % DAILY_MAP_IDS.length];
  return {
    gameMap: maps.find((m) => m.id === mapId)?.type as GameMapType,
    gameMapSize: GameMapSize.Normal,
    gameType: GameType.Singleplayer,
    gameMode: GameMode.FFA,
    difficulty: Difficulty.Medium,
    nations: "default",
    bots: DAILY_BOTS,
    donateGold: false,
    donateTroops: false,
    infiniteGold: false,
    infiniteTroops: false,
    instantBuild: false,
    randomSpawn: false,
    disabledUnits: [],
  };
}

function readDays(): DailyDays {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as DailyDays;
    return parsed !== null && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Records a finished daily game. The first result of a day stands; a win,
 * first or replayed, can only lower the day's best time.
 */
export function dailyEnded(
  gameId: string,
  result: DailyResult,
  seconds: number,
): void {
  if (!isDailyId(gameId)) return;
  try {
    const days = readDays();
    const day = idToDay(gameId);
    const secs = Math.max(0, Math.round(seconds));
    const prior = days[day];
    const faster = result === "win" && secs < (prior?.best ?? Infinity);
    if (prior !== undefined && !faster) return;
    if (prior === undefined) {
      days[day] = { result, seconds: secs };
      track("daily_end", { result });
    }
    if (faster) days[day].best = secs;
    const kept = Object.keys(days).sort().slice(-KEEP_DAYS);
    localStorage.setItem(
      KEY,
      JSON.stringify(Object.fromEntries(kept.map((d) => [d, days[d]]))),
    );
  } catch {
    // Blocked or full storage: the daily is best-effort, like PlayStats.
  }
}

export interface DailyStatus {
  doneToday: boolean;
  /**
   * Days with a finished game in a row, ending today or yesterday. One missed
   * day a week is forgiven (it does not count, it does not break the run).
   */
  streak: number;
  /** Today's fastest win, seconds. */
  best?: number;
  /** The last 7 days, oldest first, today last: each day's first result. */
  week: (DailyResult | null)[];
}

/** One missed day is forgiven per this many days of a streak. */
const GRACE_EVERY = 7;

export function dailyStatus(now: Date = new Date()): DailyStatus {
  const days = readDays();
  const at = (offset: number) =>
    new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
  const doneToday = days[at(0)] !== undefined;
  let streak = 0;
  let grace = -Infinity;
  // A streak is still alive until today ends, so start from yesterday if
  // today is not played yet.
  for (let i = doneToday ? 0 : 1; ; i++) {
    if (days[at(i)] !== undefined) {
      streak++;
    } else if (i - grace >= GRACE_EVERY && days[at(i + 1)] !== undefined) {
      grace = i;
    } else {
      break;
    }
  }
  const week = [6, 5, 4, 3, 2, 1, 0].map((i) => days[at(i)]?.result ?? null);
  return { doneToday, streak, best: days[at(0)]?.best, week };
}

export function startDailyChallenge(): void {
  const id = dailyId();
  rememberSoloConfig(dailyConfig(id));
  requestSoloReplay(ReplaySpeedMultiplier.fast, id);
  window.location.hash = "#modal=single-player";
}
