import type {
  SaveBackend,
  SavedGame,
} from "../../../src/client/mobile/SaveStore";
import { scriptedGameStart } from "../../util/ScriptedGame";

/** An in-memory slot standing in for IndexedDB. */
export function memoryBackend(initial?: unknown) {
  const slot = { value: initial as unknown };
  const log: string[] = [];
  const failNext = { put: null as Error | null };
  const backend: SaveBackend = {
    get: async () => slot.value,
    put: async (v) => {
      if (failNext.put) {
        const e = failNext.put;
        failNext.put = null;
        throw e;
      }
      log.push("put");
      slot.value = v;
    },
    delete: async () => {
      log.push("delete");
      slot.value = undefined;
    },
  };
  return { backend, slot, log, failNext };
}

export function makeSave(over: Partial<SavedGame> = {}): SavedGame {
  const info = scriptedGameStart();
  return {
    version: 1,
    commit: "DEV",
    savedAt: 1_000_000,
    gameStartInfo: {
      gameID: info.gameID,
      lobbyCreatedAt: 0,
      config: info.config,
      players: [{ clientID: "c1", username: "me", clanTag: null }],
    } as unknown as SavedGame["gameStartInfo"],
    clientID: "c1",
    speed: 1,
    turnCount: 1200,
    turns: [{ n: 5, intents: [] }],
    hashes: [[100, 11]],
    ...over,
  };
}
