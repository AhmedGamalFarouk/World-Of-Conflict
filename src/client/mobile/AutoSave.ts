// Autosave, game side: LocalServer owns one AutoSaver per solo game on the
// phone. The save is the turn list (SaveStore.ts), captured synchronously, so
// a save can never hold a half-written turn.
//
// When: every 60 s of game time (10 turns a second, never the wall clock),
// when the app goes to the background (best effort), and on EXIT TO HOME.
// The promise is "at most 60 s of game time lost".
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { ClientID, Turn } from "@openfront/engine-api/Schemas";
import type { WireGameStartInfo } from "@openfront/shared/WireSchemas";
import { appVersion, buildCommit, isDevBuild } from "./AppInfo";
import { appendError } from "./ErrorLog";
import {
  SAVE_VERSION,
  SaveError,
  SaveStore,
  saveStore,
  sparseTurns,
  type SavedGame,
} from "./SaveStore";

export const AUTOSAVE_SECONDS = 60;
const FAILURES_BEFORE_PAUSED = 3;
const DEV_OVERRIDE_KEY = "wc.dev.autosaveSeconds";

/** Autosave interval in turns. The localStorage override is for dev builds. */
export function autosaveTurns(
  storage: Pick<Storage, "getItem"> | null = safeStorage(),
  dev = isDevBuild(appVersion()),
): number {
  const override = dev ? Number(storage?.getItem(DEV_OVERRIDE_KEY)) : NaN;
  const seconds = override > 0 ? override : AUTOSAVE_SECONDS;
  return Math.max(1, Math.round(seconds * 10));
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export interface AutoSaveSource {
  turns(): readonly Turn[];
  gameStartInfo: WireGameStartInfo;
  clientID: ClientID;
  speed(): number;
  hashes(): readonly [number, number][];
}

export class AutoSaver {
  private inFlight: Promise<boolean> | null = null;
  private failures = 0;
  private stopped = false;
  private _lastSavedAt: number | null = null;
  private unlistenApp: (() => void) | null = null;
  private loggedUnavailable = false;
  // The epoch this game was created under: a clear() since then (game end,
  // abandon, discard) ends its right to write.
  private epochAtStart: number;

  constructor(
    private source: AutoSaveSource,
    private store: SaveStore = saveStore,
    private everyTurns = autosaveTurns(),
    private now: () => number = Date.now,
  ) {
    this.epochAtStart = store.currentEpoch;
  }

  /** False once the game is over or abandoned: nothing more will be saved. */
  get active(): boolean {
    return !this.stopped;
  }

  /** When the last write landed (ms), or null before the first. */
  get lastSavedAt(): number | null {
    return this._lastSavedAt;
  }

  /** Three failed writes in a row: the pause card says "Saving paused". */
  get savingPaused(): boolean {
    return this.failures >= FAILURES_BEFORE_PAUSED;
  }

  /** Autosave on background; call once at game start. */
  listenForBackground(): void {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener("appStateChange", (s) => {
      if (!s.isActive) void this.saveNow();
    });
    this.unlistenApp = () => void handle.then((h) => h.remove());
  }

  /** Called after every turn; saves each `everyTurns` turns, if idle. */
  onTurn(turnCount: number): void {
    if (this.stopped || turnCount === 0 || turnCount % this.everyTurns !== 0) {
      return;
    }
    // One write in flight; a tick that lands while one is pending is skipped.
    if (this.inFlight) return;
    void this.saveNow();
  }

  /** Saves the game as it is now. Resolves false when nothing was written. */
  async saveNow(): Promise<boolean> {
    if (this.stopped) return false;
    // Wait for a write in flight so the newest turns land after it.
    if (this.inFlight) await this.inFlight.catch(() => {});
    if (this.stopped) return false;
    this.inFlight = this.write().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private async write(): Promise<boolean> {
    const turns = this.source.turns();
    const save: SavedGame = {
      version: SAVE_VERSION,
      commit: buildCommit(),
      savedAt: this.now(),
      gameStartInfo: this.source.gameStartInfo,
      clientID: this.source.clientID,
      speed: this.source.speed(),
      turnCount: turns.length,
      turns: sparseTurns(turns),
      hashes: [...this.source.hashes()],
    };
    try {
      const written = await this.store.write(save, this.epochAtStart);
      if (written) {
        this.failures = 0;
        this._lastSavedAt = save.savedAt;
      }
      return written;
    } catch (e) {
      this.failures++;
      if (e instanceof SaveError && e.kind === "unavailable") {
        if (!this.loggedUnavailable) {
          this.loggedUnavailable = true;
          appendError({ code: "save.storage_unavailable" });
        }
      } else {
        // A full disk (QuotaExceededError) or a failed write: the previous
        // save stays, since one IndexedDB write is all or nothing.
        appendError({
          code: "save.write_failed",
          turn: save.turnCount,
          message: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        });
      }
      return false;
    }
  }

  /** Ends autosaving and removes the listener, keeping the saved game. */
  dispose(): void {
    this.stopped = true;
    this.unlistenApp?.();
    this.unlistenApp = null;
  }

  /** The game is over (win, elimination, abandon): stop and clear the save. */
  async finish(): Promise<void> {
    this.dispose();
    try {
      await this.store.clear();
    } catch {
      // Unavailable storage means there was no save to clear.
    }
  }
}

/** The running game's saver, for the pause card's buttons. */
let active: AutoSaver | null = null;
export const activeAutoSaver = (): AutoSaver | null => active;
export function setActiveAutoSaver(saver: AutoSaver | null): void {
  active = saver;
}
