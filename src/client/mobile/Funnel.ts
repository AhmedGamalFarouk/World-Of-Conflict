// Funnel events for the playtest gate (docs/mobile/GAMIFICATION-TASKS.md #0):
// where players drop between launch, spawn, the tutorial and the end of a
// game. Opt-in like every event (Analytics.ts); game-client chunk only.
import { landProgress } from "../hud/layers/GameLeftSidebar";
import type { GameView } from "../view";
import { track } from "./Analytics";

let spawnedGame: string | null = null;

/** Once per game: the player is on the map. `seconds` counts from app open. */
export function trackSpawn(gameID: string): void {
  if (spawnedGame === gameID) return;
  spawnedGame = gameID;
  trackedStep = null;
  track("spawn", { seconds: Math.round(performance.now() / 1000) });
}

let trackedStep: string | null = null;

/** Each tutorial step once as it first shows (a step shown again is not re-sent). */
export function trackTutorialStep(stepID: string): void {
  if (trackedStep === stepID) return;
  trackedStep = stepID;
  track("tutorial_step", { step: stepID });
}

/** Whole percent of the land the player holds now; 0 once eliminated. */
export function landPercent(game: GameView): number {
  return Math.round(landProgress(game)?.share ?? 0);
}

/** Test-only. */
export function resetFunnelForTests(): void {
  spawnedGame = null;
  trackedStep = null;
}
