import type { Turn } from "@openfront/engine-api/Schemas";
import type { Game } from "@openfront/engine/game/Game";
import type { GameRunner } from "@openfront/engine/GameRunner";
import { describe, expect, it } from "vitest";
import {
  expandTurns,
  parseSave,
  SaveError,
  sparseTurns,
} from "../src/client/mobile/SaveStore";
import {
  createScriptedRunner,
  scriptedGameStart,
  scriptedTurn,
} from "./util/ScriptedGame";

const MAP = "world";
const SAVED_AT = 500;
const MORE = 200;

const hash = (game: Game) => (game as unknown as { hash(): number }).hash();

/** One tick with the scripted players' next turn; returns it and the hash. */
function step(runner: GameRunner): { turn: Turn; hash: number } {
  const turn = scriptedTurn(runner.game);
  runner.addTurn(turn);
  if (!runner.executeNextTick()) throw new Error("tick failed");
  return { turn, hash: hash(runner.game) };
}

describe("resuming a saved game by replaying its turns", () => {
  it("reaches the same state as the uninterrupted game, then keeps matching", async () => {
    const start = scriptedGameStart();

    // The original game, played straight through. Its turn list up to the
    // save point is what the phone would have in memory.
    const original = await createScriptedRunner(MAP, start);
    const turns: Turn[] = [];
    const hashes: number[] = [];
    for (let i = 0; i < SAVED_AT + MORE; i++) {
      const s = step(original);
      turns.push(s.turn);
      hashes.push(s.hash);
    }

    // Saved at SAVED_AT: through the real sparse form, then expanded.
    const saved = sparseTurns(turns.slice(0, SAVED_AT));
    expect(saved.length).toBeLessThan(SAVED_AT); // quiet turns are not stored
    const replay = expandTurns(SAVED_AT, saved);
    expect(replay).toHaveLength(SAVED_AT);

    // A fresh game fed the saved turns, as the rejoin path does.
    const resumed = await createScriptedRunner(MAP, start);
    for (const turn of replay) resumed.addTurn(turn);
    let tick = 0;
    while (resumed.pendingTurns() > 0) {
      expect(resumed.executeNextTick()).toBe(true);
      expect(hash(resumed.game)).toBe(hashes[tick]);
      tick++;
    }
    expect(tick).toBe(SAVED_AT);

    // Live play continues from turn SAVED_AT, in step with the original.
    for (let i = SAVED_AT; i < SAVED_AT + MORE; i++) {
      const s = step(resumed);
      expect(s.hash).toBe(hashes[i]);
    }
  }, 300_000);
});

describe("sparse turn lists", () => {
  it("round-trips the turns that carry intents and fills the rest", () => {
    const turns: Turn[] = [
      { turnNumber: 0, intents: [] },
      {
        turnNumber: 1,
        intents: [{ type: "toggle_pause", paused: true, clientID: "c" }],
      },
      { turnNumber: 2, intents: [] },
    ];
    const sparse = sparseTurns(turns);
    expect(sparse.map((t) => t.n)).toEqual([1]);
    expect(expandTurns(3, sparse)).toEqual(turns);
  });
});

describe("parseSave", () => {
  const good = () => ({
    version: 1,
    commit: "DEV",
    savedAt: 1,
    clientID: "c",
    speed: 1,
    turnCount: 10,
    turns: [{ n: 3, intents: [] }],
    hashes: [[100, 5]],
    gameStartInfo: {
      gameID: "G",
      players: [{ clientID: "c", username: "u" }],
      config: scriptedGameStart().config,
    },
  });

  it("accepts a save and rejects every kind of damage", () => {
    expect(parseSave(good()).turnCount).toBe(10);
    const damaged: unknown[] = [
      null,
      { ...good(), version: 2 },
      { ...good(), turnCount: -1 },
      { ...good(), turns: [{ n: 10, intents: [] }] },
      { ...good(), hashes: [[1]] },
      { ...good(), gameStartInfo: { ...good().gameStartInfo, config: {} } },
      { ...good(), clientID: 7 },
    ];
    for (const raw of damaged) {
      expect(() => parseSave(raw)).toThrow(SaveError);
    }
  });
});
