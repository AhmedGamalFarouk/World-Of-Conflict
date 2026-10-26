// Daily challenge: one fixed game per UTC day, the same for every player. The
// engine seeds its PRNG from the game ID, so an ID derived from the date pins
// the whole game (spawns, bots, nations). Map, difficulty and bots are derived
// from the date too. Results live in localStorage (no telemetry offline); the
// streak counts consecutive days with a finished game.
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

/** Records a finished daily game; the first result of a day stands. */
export function dailyEnded(
  gameId: string,
  result: DailyResult,
  seconds: number,
): void {
  if (!isDailyId(gameId)) return;
  try {
    const days = readDays();
    const day = idToDay(gameId);
    if (days[day] !== undefined) return;
    days[day] = { result, seconds: Math.max(0, Math.round(seconds)) };
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
  /** Consecutive days with a finished game, ending today or yesterday. */
  streak: number;
}

export function dailyStatus(now: Date = new Date()): DailyStatus {
  const days = readDays();
  const at = (offset: number) =>
    new Date(now.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
  const doneToday = days[at(0)] !== undefined;
  let streak = 0;
  // A streak is still alive until today ends, so start from yesterday if
  // today is not played yet.
  for (let i = doneToday ? 0 : 1; days[at(i)] !== undefined; i++) streak++;
  return { doneToday, streak };
}

export function startDailyChallenge(): void {
  const id = dailyId();
  rememberSoloConfig(dailyConfig(id));
  requestSoloReplay(ReplaySpeedMultiplier.fast, id);
  window.location.hash = "#modal=single-player";
}
