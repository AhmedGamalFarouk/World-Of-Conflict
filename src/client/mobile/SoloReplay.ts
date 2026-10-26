import {
  type GameConfig,
  GameConfigSchema,
  isValidGameID,
} from "@openfront/engine-api/Schemas";
import { ReplaySpeedMultiplier } from "../utilities/ReplaySpeedMultiplier";

// Mobile aftergame "Play again" and QUICK GAME: a solo config survives the
// hop to the menu (or comes straight from it), and the solo modal starts a
// game with it at once. sessionStorage, so a fresh app launch never
// auto-starts anything.
const CONFIG_KEY = "wc-solo-config";
const REPLAY_KEY = "wc-solo-replay";
const GAME_ID_KEY = "wc-solo-gameid";

export interface SoloReplay {
  config: GameConfig;
  /** A pinned game ID (daily challenge); undefined means a random one. */
  gameID: string | undefined;
  /** Turn speed to start at; undefined keeps the default. */
  speed: ReplaySpeedMultiplier | undefined;
}

export function rememberSoloConfig(config: GameConfig): void {
  try {
    sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable: Play again falls back to the solo setup screen.
  }
}

/** `gameID` pins the game (and so its seed); otherwise a random one is made. */
export function requestSoloReplay(
  speed?: ReplaySpeedMultiplier,
  gameID?: string,
): void {
  try {
    sessionStorage.setItem(
      REPLAY_KEY,
      speed === undefined ? "1" : String(speed),
    );
    if (gameID === undefined) sessionStorage.removeItem(GAME_ID_KEY);
    else sessionStorage.setItem(GAME_ID_KEY, gameID);
  } catch {
    // As above.
  }
}

/** The replay to start, once: the request is consumed by this call. */
export function takeSoloReplay(): SoloReplay | null {
  try {
    const flag = sessionStorage.getItem(REPLAY_KEY);
    if (flag === null) return null;
    sessionStorage.removeItem(REPLAY_KEY);
    const pinned = sessionStorage.getItem(GAME_ID_KEY);
    sessionStorage.removeItem(GAME_ID_KEY);
    const raw = sessionStorage.getItem(CONFIG_KEY);
    if (raw === null) return null;
    // A damaged or outdated config falls back to the solo setup screen.
    const parsed = GameConfigSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const speed = Number(flag);
    return {
      config: parsed.data,
      gameID: pinned !== null && isValidGameID(pinned) ? pinned : undefined,
      speed: flag !== "1" && Number.isFinite(speed) ? speed : undefined,
    };
  } catch {
    return null;
  }
}
