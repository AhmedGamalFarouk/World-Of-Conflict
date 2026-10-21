import { EventBus } from "@openfront/shared/EventBus";
import type { ServerMessage } from "@openfront/shared/WireSchemas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSave, memoryBackend } from "./saveFixtures";

const holder = vi.hoisted(() => ({ backend: null as unknown }));

vi.mock("../../../src/client/Auth", () => ({
  getAuthHeader: vi.fn(async () => ""),
  getPersistentID: vi.fn(() => "123e4567-e89b-12d3-a456-426614174000"),
}));
vi.mock("../../../src/client/Api", () => ({ getApiBase: vi.fn(() => "") }));
vi.mock("src/client/ClientEnv", () => ({
  ClientEnv: {
    turnIntervalMs: vi.fn(() => 100),
    gitCommit: vi.fn(() => "DEV"),
  },
}));
vi.mock("../../../src/client/mobile/SaveStore", async (importOriginal) => {
  const m =
    await importOriginal<
      typeof import("../../../src/client/mobile/SaveStore")
    >();
  return {
    ...m,
    saveStore: new m.SaveStore(async () => holder.backend as never),
  };
});

import { LocalServer } from "../../../src/client/LocalServer";
import {
  readErrorLog,
  resetErrorLogForTests,
} from "../../../src/client/mobile/ErrorLog";
import {
  GameOverEvent,
  GameResumedEvent,
} from "../../../src/client/mobile/SaveEvents";
import {
  type SavedGame,
  saveStore,
} from "../../../src/client/mobile/SaveStore";

let mem: ReturnType<typeof memoryBackend>;
let server: LocalServer;
let sent: ServerMessage[];
let bus: EventBus;

function open(resume?: SavedGame) {
  bus = new EventBus();
  sent = [];
  const save = resume ?? makeSave();
  server = new LocalServer(
    {
      gameID: save.gameStartInfo.gameID,
      playerName: "me",
      playerClanTag: null,
      gameStartInfo: save.gameStartInfo,
      resume,
    } as never,
    false,
    bus,
  );
  server.updateCallback(
    () => {},
    (msg) => {
      sent.push(msg);
      if (msg.type === "turn") server.turnComplete();
    },
  );
  server.start();
}

const turnsSent = () => sent.filter((m) => m.type === "turn");

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("MODE", "mobile");
  localStorage.clear();
  resetErrorLogForTests();
  mem = memoryBackend();
  holder.backend = mem.backend;
  saveStore.resetBackendForTests();
  // Dev build: one second of game time between saves.
  localStorage.setItem("wc.dev.autosaveSeconds", "1");
});
afterEach(() => {
  server.endGame();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("a resumed LocalServer", () => {
  const resume = makeSave({
    turnCount: 50,
    turns: [{ n: 7, intents: [] }],
    hashes: [[100, 555]],
  });

  it("opens paused with every saved turn, numbering live turns from the saved count", () => {
    open(resume);
    const announced: GameResumedEvent[] = [];
    bus.on(GameResumedEvent, (e) => announced.push(e));

    server.onMessage({ type: "rejoin", lastTurn: 0 } as never);
    const starts = sent.filter((m) => m.type === "start");
    const start = starts[starts.length - 1] as {
      turns: { turnNumber: number }[];
    };
    expect(start.turns).toHaveLength(50);
    expect(start.turns.map((t) => t.turnNumber)).toEqual(
      Array.from({ length: 50 }, (_, i) => i),
    );
    expect(announced).toEqual([new GameResumedEvent(50, resume.savedAt)]);

    // Paused: no live turn however long it waits.
    vi.advanceTimersByTime(2000);
    expect(turnsSent()).toHaveLength(0);

    // The player taps RESUME.
    server.onMessage({
      type: "intent",
      intent: { type: "toggle_pause", paused: false },
    } as never);
    expect(
      turnsSent().map(
        (m) => (m as { turn: { turnNumber: number } }).turn.turnNumber,
      ),
    ).toEqual([50]);
    // The record stays one continuous list, 0..50.
    const record = (server as unknown as { turns: { turnNumber: number }[] })
      .turns;
    expect(record.map((t) => t.turnNumber)).toEqual(
      Array.from({ length: 51 }, (_, i) => i),
    );
  });

  it("logs resume-desync once when the replayed state disagrees, never when it agrees", () => {
    open(resume);
    server.onMessage({ type: "hash", turnNumber: 100, hash: 555 } as never);
    expect(readErrorLog()).toEqual([]);

    open(resume);
    server.onMessage({ type: "hash", turnNumber: 100, hash: 1 } as never);
    server.onMessage({ type: "hash", turnNumber: 100, hash: 2 } as never);
    expect(readErrorLog().map((e) => e.code)).toEqual(["resume-desync"]);
  });
});

describe("autosave in the local server", () => {
  async function runTurns(n: number) {
    server.onMessage({ type: "rejoin", lastTurn: 0 } as never);
    for (let i = 0; i < n; i++) vi.advanceTimersByTime(100);
  }

  it("writes the turn list and the state hashes every 60 s of game time", async () => {
    open();
    server.onMessage({ type: "hash", turnNumber: 100, hash: 9 } as never);
    await runTurns(25);
    await vi.waitFor(async () => {
      const save = await saveStore.read();
      // The dev override makes it 10 turns; whole multiples only.
      expect(save?.turnCount).toBeGreaterThanOrEqual(10);
      expect(save!.turnCount % 10).toBe(0);
      expect(save?.hashes).toEqual([[100, 9]]);
    });
  });

  it("a win or an elimination clears the save and stops saving", async () => {
    open();
    await runTurns(25);
    await vi.waitFor(async () => expect(await saveStore.read()).not.toBeNull());

    bus.emit(new GameOverEvent("loss"));
    await vi.waitFor(async () => expect(await saveStore.read()).toBeNull());
    await runTurns(25);
    await vi.advanceTimersByTimeAsync(10);
    expect(await saveStore.read()).toBeNull();
  });

  it("a winner message clears the save", async () => {
    open();
    await runTurns(25);
    await vi.waitFor(async () => expect(await saveStore.read()).not.toBeNull());
    server.onMessage({
      type: "winner",
      winner: ["player", "c1"],
      allPlayersStats: {},
    } as never);
    await vi.waitFor(async () => expect(await saveStore.read()).toBeNull());
  });
});
