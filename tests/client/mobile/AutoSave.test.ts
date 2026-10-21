import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTOSAVE_SECONDS,
  AutoSaver,
  autosaveTurns,
} from "../../../src/client/mobile/AutoSave";
import {
  readErrorLog,
  resetErrorLogForTests,
} from "../../../src/client/mobile/ErrorLog";
import { SaveStore } from "../../../src/client/mobile/SaveStore";
import { makeSave, memoryBackend } from "./saveFixtures";

const turns = (n: number, withIntent: number[] = []) =>
  Array.from({ length: n }, (_, i) => ({
    turnNumber: i,
    intents: withIntent.includes(i)
      ? [{ type: "toggle_pause", paused: true, clientID: "c1" }]
      : [],
  })) as never;

function setup(everyTurns = 600) {
  const mem = memoryBackend();
  const store = new SaveStore(async () => mem.backend);
  let list = turns(0);
  const hashes: [number, number][] = [[100, 7]];
  const saver = new AutoSaver(
    {
      turns: () => list,
      gameStartInfo: makeSave().gameStartInfo,
      clientID: "c1",
      speed: () => 0.5,
      hashes: () => hashes,
    },
    store,
    everyTurns,
    () => 42_000,
  );
  return {
    mem,
    store,
    saver,
    setTurns: (n: number, w?: number[]) => (list = turns(n, w)),
  };
}

beforeEach(() => {
  localStorage.clear();
  resetErrorLogForTests();
});

describe("AutoSaver", () => {
  it("saves every 60 s of game time, 600 turns, and not before", async () => {
    expect(AUTOSAVE_SECONDS).toBe(60);
    expect(autosaveTurns(null)).toBe(600);
    const { saver, store, mem, setTurns } = setup(600);
    setTurns(599);
    saver.onTurn(599);
    expect(mem.log).toEqual([]);
    setTurns(600, [3]);
    saver.onTurn(600);
    await vi.waitFor(async () => expect(await store.read()).not.toBeNull());
    expect(await store.read()).toMatchObject({
      turnCount: 600,
      speed: 0.5,
      savedAt: 42_000,
      hashes: [[100, 7]],
      turns: [{ n: 3 }],
    });
  });

  it("captures the turns as they are, with quiet turns left out", async () => {
    const { saver, store, setTurns } = setup();
    setTurns(1000, [10, 20]);
    expect(await saver.saveNow()).toBe(true);
    const save = (await store.read())!;
    expect(save.turnCount).toBe(1000);
    expect(save.turns.map((t) => t.n)).toEqual([10, 20]);
    expect(saver.lastSavedAt).toBe(42_000);
  });

  it("skips a tick that lands while a write is in flight", async () => {
    const { saver, mem, setTurns } = setup(1);
    setTurns(5);
    saver.onTurn(5);
    saver.onTurn(6); // pending: skipped
    await vi.waitFor(() => expect(saver.lastSavedAt).not.toBeNull());
    expect(mem.log.filter((e) => e === "put")).toHaveLength(1);
  });

  it("keeps the previous save on a failed write; saving pauses after 3", async () => {
    const { saver, store, mem, setTurns } = setup();
    setTurns(100);
    expect(await saver.saveNow()).toBe(true);
    setTurns(200);
    for (let i = 0; i < 3; i++) {
      expect(saver.savingPaused).toBe(false);
      mem.failNext.put = new DOMException("full", "QuotaExceededError");
      expect(await saver.saveNow()).toBe(false);
    }
    expect(saver.savingPaused).toBe(true);
    expect((await store.read())?.turnCount).toBe(100);
    expect(readErrorLog().map((e) => e.code)).toEqual([
      "save.write_failed",
      "save.write_failed",
      "save.write_failed",
    ]);
    // A later success clears the warning.
    expect(await saver.saveNow()).toBe(true);
    expect(saver.savingPaused).toBe(false);
  });

  it("logs unavailable storage once", async () => {
    const store = new SaveStore(async () => null);
    const saver = new AutoSaver(
      {
        turns: () => turns(10),
        gameStartInfo: makeSave().gameStartInfo,
        clientID: "c1",
        speed: () => 1,
        hashes: () => [],
      },
      store,
      600,
    );
    await saver.saveNow();
    await saver.saveNow();
    expect(
      readErrorLog().filter((e) => e.code === "save.storage_unavailable"),
    ).toHaveLength(1);
  });

  it("finishing the game clears the save, and a write in flight cannot resurrect it", async () => {
    const { saver, store, setTurns } = setup();
    setTurns(100);
    const pending = saver.saveNow();
    await saver.finish(); // elimination / win / abandon
    await pending;
    expect(await store.read()).toBeNull();
    expect(saver.active).toBe(false);
    expect(await saver.saveNow()).toBe(false);
  });

  it("a write queued after the game ended is dropped", async () => {
    const { saver, store, setTurns } = setup();
    setTurns(100);
    await saver.saveNow();
    const pending = saver.saveNow(); // in flight: captured under the old epoch
    await store.clear(); // discard from the title screen, say
    expect(await pending).toBe(false);
    expect(await store.read()).toBeNull();
  });

  it("dispose keeps the saved game", async () => {
    const { saver, store, setTurns } = setup();
    setTurns(100);
    await saver.saveNow();
    saver.dispose();
    expect((await store.read())?.turnCount).toBe(100);
  });

  it("the dev override works in dev builds only", () => {
    const storage = { getItem: () => "5" };
    expect(autosaveTurns(storage, true)).toBe(50);
    expect(autosaveTurns(storage, false)).toBe(600);
  });
});
