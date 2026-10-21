// Save and resume, storage side (homepage chunk: the title screen reads it).
//
// A save is the game's turn list. The simulation is deterministic, so a
// resumed game starts fresh and the existing rejoin path feeds it every saved
// turn; the worker catches up to where the player left. That needs no
// snapshot (a restored game would reach the client view with no tiles, units
// or motion plans: the engine only emits what changed) and no engine change.
// Turns without intents are stored as a count, so a 30 minute game is a few
// KB. The state hash the original run reported every 100 ticks is kept too
// and compared during the catch-up (LocalServer, `resume-desync`).
import type {
  ClientID,
  StampedIntent,
  Turn,
} from "@openfront/engine-api/Schemas";
import { GameConfigSchema } from "@openfront/engine-api/Schemas";
import type { WireGameStartInfo } from "@openfront/shared/WireSchemas";
import { buildCommit } from "./AppInfo";

export const SAVE_VERSION = 1;
const DB_NAME = "wc-saves";
const STORE_NAME = "wc-saves";
const KEY = "current";
const OPEN_TIMEOUT_MS = 4000;

/** A turn that carries intents; the others are implied by `turnCount`. */
export interface SavedTurn {
  n: number;
  intents: StampedIntent[];
}

export interface SavedGame {
  version: typeof SAVE_VERSION;
  /** buildCommit() of the build that wrote it: a save only resumes on it. */
  commit: string;
  savedAt: number;
  gameStartInfo: WireGameStartInfo;
  clientID: ClientID;
  /** The turn speed multiplier in force. */
  speed: number;
  /** Turns 0..turnCount-1, of which only the non-empty ones are listed. */
  turnCount: number;
  turns: SavedTurn[];
  /** [tick, state hash] the game reported every 100 ticks. */
  hashes: [number, number][];
}

export type SaveErrorKind = "unavailable" | "damaged";

export class SaveError extends Error {
  constructor(
    readonly kind: SaveErrorKind,
    detail = "",
  ) {
    super(`save ${kind}${detail ? `: ${detail}` : ""}`);
  }
}

/** Game seconds: ten turns a second whatever the speed. */
export const elapsedSeconds = (s: Pick<SavedGame, "turnCount">) =>
  s.turnCount / 10;

export function sparseTurns(turns: readonly Turn[]): SavedTurn[] {
  const out: SavedTurn[] = [];
  turns.forEach((t, n) => {
    if (t.intents.length > 0) out.push({ n, intents: t.intents });
  });
  return out;
}

export function expandTurns(
  count: number,
  sparse: readonly SavedTurn[],
): Turn[] {
  const turns: Turn[] = Array.from({ length: count }, (_, n) => ({
    turnNumber: n,
    intents: [],
  }));
  for (const s of sparse) turns[s.n] = { turnNumber: s.n, intents: s.intents };
  return turns;
}

/** Validates what came out of storage; throws SaveError("damaged"). */
export function parseSave(raw: unknown): SavedGame {
  const bad = (why: string): never => {
    throw new SaveError("damaged", why);
  };
  if (typeof raw !== "object" || raw === null) return bad("not an object");
  const s = raw as Partial<SavedGame>;
  if (s.version !== SAVE_VERSION) return bad("version");
  if (typeof s.commit !== "string" || typeof s.savedAt !== "number") {
    return bad("header");
  }
  if (!Number.isInteger(s.turnCount) || (s.turnCount as number) < 0) {
    return bad("turnCount");
  }
  if (typeof s.speed !== "number" || typeof s.clientID !== "string") {
    return bad("speed or clientID");
  }
  const info = s.gameStartInfo;
  if (
    !info ||
    typeof info.gameID !== "string" ||
    !Array.isArray(info.players) ||
    info.players.length === 0 ||
    !GameConfigSchema.safeParse(info.config).success
  ) {
    return bad("gameStartInfo");
  }
  if (
    !Array.isArray(s.turns) ||
    s.turns.some(
      (t) =>
        !Number.isInteger(t?.n) ||
        t.n < 0 ||
        t.n >= (s.turnCount as number) ||
        !Array.isArray(t.intents),
    )
  ) {
    return bad("turns");
  }
  if (
    !Array.isArray(s.hashes) ||
    s.hashes.some(
      (h) =>
        !Array.isArray(h) ||
        h.length !== 2 ||
        !Number.isFinite(h[0]) ||
        !Number.isFinite(h[1]),
    )
  ) {
    return bad("hashes");
  }
  return s as SavedGame;
}

/** Dev builds report commit DEV and never go stale. */
export function isStale(
  save: Pick<SavedGame, "commit">,
  current = buildCommit(),
) {
  return save.commit !== "DEV" && current !== "DEV" && save.commit !== current;
}

export interface SaveBackend {
  get(): Promise<unknown>;
  put(value: unknown): Promise<void>;
  delete(): Promise<void>;
}

const wrap = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

/** null when IndexedDB is missing or won't open in time. */
export async function openIdbBackend(
  idb: IDBFactory | undefined = globalThis.indexedDB,
  timeoutMs = OPEN_TIMEOUT_MS,
): Promise<SaveBackend | null> {
  if (idb === undefined) return null;
  const db = await new Promise<IDBDatabase | null>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      resolve(null);
    }, timeoutMs);
    try {
      const open = idb.open(DB_NAME, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(STORE_NAME);
      open.onsuccess = () => {
        if (settled) {
          open.result.close();
          return;
        }
        settled = true;
        clearTimeout(timer);
        open.result.onversionchange = () => open.result.close();
        resolve(open.result);
      };
      open.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      };
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
  if (db === null) return null;
  return {
    get: () =>
      wrap(db.transaction(STORE_NAME).objectStore(STORE_NAME).get(KEY)),
    async put(value) {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, KEY);
      await txDone(tx);
    },
    async delete() {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(KEY);
      await txDone(tx);
    },
  };
}

/**
 * The one save slot. Writes and clears run one at a time, and `epoch` ends
 * a game's right to write: game end, abandon, discard and elimination bump
 * it (clear() does), so a write already queued drops silently instead of
 * resurrecting a cleared save.
 */
export class SaveStore {
  private epoch = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private backend: Promise<SaveBackend | null> | null = null;

  constructor(private open: () => Promise<SaveBackend | null>) {}

  get currentEpoch(): number {
    return this.epoch;
  }

  private async backendOrThrow(): Promise<SaveBackend> {
    this.backend ??= this.open().then((b) => {
      // Timed out or missing: try again on the next call.
      if (b === null) this.backend = null;
      return b;
    });
    const b = await this.backend;
    if (b === null) throw new SaveError("unavailable");
    return b;
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job, job);
    this.queue = run.catch(() => {});
    return run;
  }

  /** The save, or null when there is none. Throws SaveError. */
  read(): Promise<SavedGame | null> {
    return this.enqueue(async () => {
      const raw = await (await this.backendOrThrow()).get();
      return raw === undefined ? null : parseSave(raw);
    });
  }

  /** Writes unless `epoch` is no longer current; false when dropped. */
  write(save: SavedGame, epoch: number): Promise<boolean> {
    return this.enqueue(async () => {
      if (epoch !== this.epoch) return false;
      await (await this.backendOrThrow()).put(save);
      return true;
    });
  }

  /** Test-only: forget the opened backend. */
  resetBackendForTests(): void {
    this.backend = null;
  }

  /** Clears the slot and ends every game's right to write to it. */
  clear(): Promise<void> {
    this.epoch++;
    return this.enqueue(async () => {
      await (await this.backendOrThrow()).delete();
    });
  }
}

export const saveStore = new SaveStore(() => openIdbBackend());
