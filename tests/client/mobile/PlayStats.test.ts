import { beforeEach, describe, expect, it } from "vitest";
import {
  gameEnded,
  gameStarted,
  medianGame,
  readPlayStats,
} from "../../../src/client/mobile/PlayStats";

beforeEach(() => localStorage.clear());

describe("PlayStats", () => {
  it("counts started, and finished only for a win or a loss", () => {
    gameStarted();
    gameStarted();
    gameEnded("win", 600);
    gameEnded("quit", 30);
    gameEnded("abandoned", 30);
    const s = readPlayStats()!;
    expect(s.started).toBe(2);
    expect(s.finished).toBe(1);
    expect(s.games.map((g) => g.reason)).toEqual(["win", "quit", "abandoned"]);
  });

  it("keeps the last 20 games", () => {
    for (let i = 0; i < 25; i++) gameEnded("win", i);
    const s = readPlayStats()!;
    expect(s.games).toHaveLength(20);
    expect(s.games[0].seconds).toBe(5);
  });

  it("reads old data without a games list", () => {
    localStorage.setItem(
      "wc.playStats",
      JSON.stringify({ started: 3, finished: 1, first: 1, last: 2 }),
    );
    expect(readPlayStats()!.games).toEqual([]);
  });

  it("survives blocked storage", () => {
    const real = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      expect(() => gameStarted()).not.toThrow();
    } finally {
      Storage.prototype.setItem = real;
    }
  });
});

describe("medianGame", () => {
  const stats = (...games: [string, number][]) => ({
    started: 0,
    finished: 0,
    first: 0,
    last: 0,
    games: games.map(([reason, seconds]) => ({
      reason: reason as "win",
      seconds,
    })),
  });

  it("is hidden below 3 won or lost games, quits do not count", () => {
    expect(medianGame(stats(["win", 600], ["loss", 600]))).toBeNull();
    expect(
      medianGame(stats(["win", 600], ["loss", 600], ["quit", 60])),
    ).toBeNull();
  });

  it("is provisional below 10 games and final from 10", () => {
    const three = stats(["win", 300], ["loss", 600], ["win", 900]);
    expect(medianGame(three)).toEqual({ minutes: 10, provisional: true });
    const ten = stats(
      ...Array.from({ length: 10 }, () => ["win", 480] as [string, number]),
    );
    expect(medianGame(ten)).toEqual({ minutes: 8, provisional: false });
  });
});
