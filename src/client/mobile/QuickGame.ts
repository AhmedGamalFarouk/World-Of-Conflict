// Quick game: one tap from the title screen into a short solo game. The three
// smallest curated maps (by map.bin), 5 bots, fast speed. Provisional until
// PlayStats shows real game lengths, then retuned by hand toward 5-10 minute
// games (docs/mobile/NEXT-STEPS.md C2).
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  maps,
} from "@openfront/engine-api/game/GameTypes";
import type { GameConfig } from "@openfront/engine-api/Schemas";
import { ReplaySpeedMultiplier } from "../utilities/ReplaySpeedMultiplier";
import { rememberSoloConfig, requestSoloReplay } from "./SoloReplay";

// tests/client/mobile/QuickGame.test.ts checks these against the map files.
export const QUICK_GAME_MAP_IDS = [
  "BosphorusStraits",
  "Pangaea",
  "Caucasus",
] as const;

export const QUICK_GAME_BOTS = 5;
export const QUICK_GAME_SPEED = ReplaySpeedMultiplier.fast;

export function quickGameConfig(
  random: () => number = Math.random,
): GameConfig {
  const id =
    QUICK_GAME_MAP_IDS[Math.floor(random() * QUICK_GAME_MAP_IDS.length)];
  const map = maps.find((m) => m.id === id)?.type as GameMapType;
  return {
    gameMap: map,
    gameMapSize: GameMapSize.Normal,
    gameType: GameType.Singleplayer,
    gameMode: GameMode.FFA,
    difficulty: Difficulty.Easy,
    nations: "default",
    bots: QUICK_GAME_BOTS,
    donateGold: false,
    donateTroops: false,
    infiniteGold: false,
    infiniteTroops: false,
    instantBuild: false,
    randomSpawn: false,
    disabledUnits: [],
  };
}

/** Opens the solo modal in its start-at-once mode with a quick game. */
export function startQuickGame(): void {
  rememberSoloConfig(quickGameConfig());
  requestSoloReplay(QUICK_GAME_SPEED);
  window.location.hash = "#modal=single-player";
}
