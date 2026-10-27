// Quick game: one tap from the title screen into a short solo game. The three
// smallest curated maps (by map.bin), 5 bots, fast speed, and the nation
// difficulty the player picks first. Provisional until
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
import { translateText } from "../Utils";
import { CONFIRM_ID } from "./SaveHome";
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
  difficulty: Difficulty,
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
    difficulty,
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

export const QUICK_DIFFICULTY_KEY = "wc-quick-difficulty";

// Medium is what public free-for-all games use. Storage can be missing or
// hold anything, so a read that isn't a known difficulty falls back to it.
export function lastDifficulty(): Difficulty {
  try {
    const stored = localStorage.getItem(QUICK_DIFFICULTY_KEY);
    return (
      Object.values(Difficulty).find((d) => d === stored) ?? Difficulty.Medium
    );
  } catch {
    return Difficulty.Medium;
  }
}

function rememberDifficulty(difficulty: Difficulty): void {
  try {
    localStorage.setItem(QUICK_DIFFICULTY_KEY, difficulty);
  } catch {
    // Not remembered; the picker shows Medium next time.
  }
}

export const DIFFICULTY_CHOICES = [
  [Difficulty.Easy, "difficulty.easy"],
  [Difficulty.Medium, "difficulty.medium"],
  [Difficulty.Hard, "difficulty.hard"],
  [Difficulty.Impossible, "difficulty.impossible"],
] as const;

/**
 * Asks which nation difficulty the quick game gets. Same themed card as the
 * discard confirmation, so Android back (which clicks `.wc-keep`) cancels.
 * Resolves null when the player backs out.
 */
export function chooseQuickDifficulty(): Promise<Difficulty | null> {
  return new Promise((resolve) => {
    const el = (tag: string, cls: string, content = "") => {
      const node = document.createElement(tag);
      node.className = cls;
      node.textContent = content;
      return node;
    };
    const root = el("div", "wc-scrim wc-confirm");
    root.id = CONFIRM_ID;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", `${CONFIRM_ID}-title`);
    const card = el("div", "wc-plate wc-confirm-card");
    const title = el(
      "h2",
      "wc-confirm-title",
      translateText("difficulty.difficulty"),
    );
    title.id = `${CONFIRM_ID}-title`;
    card.append(title);
    const finish = (picked: Difficulty | null) => {
      root.remove();
      resolve(picked);
    };
    const last = lastDifficulty();
    let preferred: HTMLElement | null = null;
    for (const [difficulty, key] of DIFFICULTY_CHOICES) {
      const isLast = difficulty === last;
      const pick = el(
        "button",
        `wc-btn ${isLast ? "wc-btn-gold" : "wc-btn-steel"} wc-pick`,
        translateText(key),
      );
      pick.addEventListener("click", () => {
        rememberDifficulty(difficulty);
        finish(difficulty);
      });
      if (isLast) preferred = pick;
      card.append(pick);
    }
    const cancel = el(
      "button",
      "wc-btn wc-btn-steel wc-keep",
      translateText("common.cancel"),
    );
    cancel.addEventListener("click", () => finish(null));
    card.append(cancel);
    root.append(card);
    document.body.append(root);
    (preferred ?? cancel).focus();
  });
}

/** Opens the solo modal in its start-at-once mode with a quick game. */
export function startQuickGame(difficulty: Difficulty): void {
  rememberSoloConfig(quickGameConfig(difficulty));
  requestSoloReplay(QUICK_GAME_SPEED);
  window.location.hash = "#modal=single-player";
}
