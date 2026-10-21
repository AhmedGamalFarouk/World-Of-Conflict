// Save and resume, title-screen side (homepage chunk): what the CONTINUE
// plate shows, the "discard?" confirmation every new game start goes through,
// and the CONTINUE tap itself. Game-side capture is AutoSave.ts.
import { getMapName, translateText } from "../Utils";
import { appendError } from "./ErrorLog";
import { gameEnded } from "./PlayStats";
import {
  elapsedSeconds,
  isStale,
  type SavedGame,
  SaveError,
  saveStore,
} from "./SaveStore";

export type HomeSave =
  | { kind: "none" }
  | { kind: "save"; mapName: string; seconds: number; savedAt: number }
  | { kind: "notice"; key: "save.stale" | "save.damaged" };

let state: HomeSave = { kind: "none" };
let continuing = false;
let loggedUnavailable = false;
// The boot read: new games and their savers wait for it, so a stale save is
// cleared (and the epoch bumped) before any game takes its epoch.
let homeLoad: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function set(next: HomeSave): void {
  state = next;
  listeners.forEach((cb) => cb());
}

export const homeSave = (): HomeSave => state;
export const homeSaveReady = (): Promise<void> => homeLoad;
export const isContinuing = (): boolean => continuing;

export function onHomeSaveChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function summary(save: SavedGame): HomeSave {
  return {
    kind: "save",
    mapName: getMapName(save.gameStartInfo.config.gameMap) ?? "",
    seconds: elapsedSeconds(save),
    savedAt: save.savedAt,
  };
}

/**
 * Boot: reads the save for the title screen. A save from another build, or
 * one that can't be read, is discarded here with a notice in the card's
 * slot, recorded as an abandoned game and logged.
 */
export function loadHomeSave(): Promise<void> {
  homeLoad = readHomeSave();
  return homeLoad;
}

async function readHomeSave(): Promise<void> {
  try {
    const save = await saveStore.read();
    if (save === null) return set({ kind: "none" });
    if (isStale(save)) {
      appendError({
        code: "save.stale",
        commits: `${save.commit} -> current`,
      });
      gameEnded("abandoned", elapsedSeconds(save));
      await saveStore.clear().catch(() => {});
      return set({ kind: "notice", key: "save.stale" });
    }
    set(summary(save));
  } catch (e) {
    if (e instanceof SaveError && e.kind === "damaged") {
      appendError({ code: "save.damaged", message: e.message });
      gameEnded("abandoned", 0);
      await saveStore.clear().catch(() => {});
      return set({ kind: "notice", key: "save.damaged" });
    }
    // No IndexedDB: no CONTINUE, said once in the log.
    if (!loggedUnavailable) {
      loggedUnavailable = true;
      appendError({ code: "save.storage_unavailable" });
    }
    set({ kind: "none" });
  }
}

export function dismissNotice(): void {
  if (state.kind === "notice") set({ kind: "none" });
}

/** Clears the saved game and counts it as an abandoned game. */
export async function discardSavedGame(): Promise<void> {
  if (state.kind === "save") gameEnded("abandoned", state.seconds);
  await saveStore.clear().catch(() => {});
  set({ kind: "none" });
}

export interface ConfirmGoneText {
  title: string;
  body: string;
  keep: string;
  destroy: string;
}

export const CONFIRM_ID = "wc-confirm-gone";

/**
 * Themed two-button confirmation for destroying a game: KEEP is the gold
 * face (and what Android back does), the destructive button is steel.
 * Resolves true when the player destroys.
 */
export function confirmGone(text: ConfirmGoneText): Promise<boolean> {
  return new Promise((resolve) => {
    const el = (tag: string, cls: string, content = "") => {
      const node = document.createElement(tag);
      node.className = cls;
      node.textContent = content;
      return node;
    };
    const root = el("div", "wc-scrim wc-confirm");
    root.id = CONFIRM_ID;
    root.setAttribute("role", "alertdialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", `${CONFIRM_ID}-title`);
    const card = el("div", "wc-plate wc-confirm-card");
    const title = el("h2", "wc-confirm-title", text.title);
    title.id = `${CONFIRM_ID}-title`;
    const keep = el("button", "wc-btn wc-btn-gold wc-keep", text.keep);
    const destroy = el(
      "button",
      "wc-btn wc-btn-steel wc-destroy",
      text.destroy,
    );
    const finish = (destroyed: boolean) => {
      root.remove();
      resolve(destroyed);
    };
    keep.addEventListener("click", () => finish(false));
    destroy.addEventListener("click", () => finish(true));
    card.append(title, el("p", "wc-confirm-body", text.body), keep, destroy);
    root.append(card);
    document.body.append(root);
    keep.focus();
  });
}

/** DISCARD SAVED GAME? Resolves true when the player agrees to destroy it. */
export function confirmDiscard(): Promise<boolean> {
  return confirmGone({
    title: translateText("save.discard_title"),
    body: translateText("save.discard_body"),
    keep: translateText("save.keep"),
    destroy: translateText("save.discard"),
  });
}

/**
 * Every new game start goes through here. With a save it asks first; true
 * means go ahead (nothing was saved, or the player discarded it).
 */
export async function allowNewGame(): Promise<boolean> {
  await homeLoad;
  if (state.kind !== "save") return true;
  if (!(await confirmDiscard())) return false;
  await discardSavedGame();
  return true;
}

/**
 * CONTINUE: loading screen at once, then the saved game joins like a solo one.
 * The buttons stay off once the join is sent: the game page replaces the
 * title screen, and a second tap would start a second resume.
 */
export async function continueSavedGame(): Promise<void> {
  if (continuing) return;
  continuing = true;
  listeners.forEach((cb) => cb());
  const overlay = document.querySelector("game-starting-modal") as
    | (HTMLElement & { show?: () => void; hide?: () => void })
    | null;
  overlay?.show?.();
  const giveUp = async () => {
    overlay?.hide?.();
    continuing = false;
    await loadHomeSave();
  };
  try {
    const save = await saveStore.read();
    if (save === null || isStale(save)) return await giveUp();
    document.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          gameID: save.gameStartInfo.gameID,
          gameStartInfo: save.gameStartInfo,
          source: "singleplayer",
          speed: save.speed,
          resume: save,
        },
        bubbles: true,
        composed: true,
      }),
    );
  } catch {
    await giveUp();
  }
}

/** Test-only. */
export function resetHomeSaveForTests(): void {
  state = { kind: "none" };
  continuing = false;
  loggedUnavailable = false;
  homeLoad = Promise.resolve();
  listeners.clear();
}
