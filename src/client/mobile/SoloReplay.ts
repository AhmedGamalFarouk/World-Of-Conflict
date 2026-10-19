import type { GameConfig } from "@openfront/engine-api/Schemas";

// Mobile aftergame "Play again": the last solo game's settings survive the
// reload to the menu, and the solo modal starts a new game with them at once.
// sessionStorage, so a fresh app launch never auto-starts anything.
const CONFIG_KEY = "wc-solo-config";
const REPLAY_KEY = "wc-solo-replay";

export function rememberSoloConfig(config: GameConfig): void {
  try {
    sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable: Play again falls back to the solo setup screen.
  }
}

export function requestSoloReplay(): void {
  try {
    sessionStorage.setItem(REPLAY_KEY, "1");
  } catch {
    // As above.
  }
}

/** The config to replay, once: the request is consumed by this call. */
export function takeSoloReplay(): GameConfig | null {
  try {
    if (sessionStorage.getItem(REPLAY_KEY) === null) return null;
    sessionStorage.removeItem(REPLAY_KEY);
    const raw = sessionStorage.getItem(CONFIG_KEY);
    return raw === null ? null : (JSON.parse(raw) as GameConfig);
  } catch {
    return null;
  }
}
