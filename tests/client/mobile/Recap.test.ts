import { PlayerType } from "@openfront/engine-api/game/GameTypes";
import { beforeEach, describe, expect, it } from "vitest";
import {
  commanderRecord,
  formatDuration,
  notePeakLand,
  recordGame,
  resetRecapForTests,
  rivalCount,
} from "../../../src/client/mobile/Recap";
import type { GameView } from "../../../src/client/view";

const none = { out: 0, total: 0 };
const game = (over: Partial<Parameters<typeof recordGame>[0]> = {}) => ({
  id: "g1",
  map: "europe",
  mapName: "Europe",
  seconds: 600,
  won: false,
  land: 10,
  ...over,
});

beforeEach(() => {
  localStorage.clear();
  resetRecapForTests();
});

describe("recordGame", () => {
  it("says nothing on a first loss on a map (nothing to compare with)", () => {
    expect(recordGame(game(), none).note).toBeNull();
  });

  it("a first win is named, a slower one is not", () => {
    const first = recordGame(game({ won: true }), none);
    expect(first.note?.key).toBe("mobile.recap_first_win");
    expect(first.note?.params).toEqual({ map: "Europe" });
    expect(
      recordGame(game({ id: "g2", won: true, seconds: 700 }), none).note,
    ).toBeNull();
  });

  it("a faster win beats the best; an equal one does not", () => {
    recordGame(game({ won: true, seconds: 600 }), none);
    expect(
      recordGame(game({ id: "g2", won: true, seconds: 600 }), none).note,
    ).toBeNull();
    expect(
      recordGame(game({ id: "g3", won: true, seconds: 500 }), none).note?.key,
    ).toBe("mobile.recap_fastest_win");
  });

  it("a longer loss is the longest game; a shorter one with more land is most land", () => {
    recordGame(game({ seconds: 600, land: 10 }), none);
    expect(
      recordGame(game({ id: "g2", seconds: 900, land: 5 }), none).note?.key,
    ).toBe("mobile.recap_longest");
    const more = recordGame(game({ id: "g3", seconds: 300, land: 30 }), none);
    expect(more.note?.key).toBe("mobile.recap_most_land");
    expect(more.note?.params).toEqual({ map: "Europe", percent: 30 });
    expect(
      recordGame(game({ id: "g4", seconds: 300, land: 2 }), none).note,
    ).toBeNull();
  });

  it("keeps bests per map", () => {
    recordGame(game({ won: true }), none);
    expect(
      recordGame(
        game({ id: "g2", map: "asia", mapName: "Asia", won: true }),
        none,
      ).note?.key,
    ).toBe("mobile.recap_first_win");
  });

  it("peak land is the most held during the game, or the end share if higher", () => {
    notePeakLand("g1", 41.6);
    notePeakLand("g1", 20);
    expect(recordGame(game({ land: 0 }), none).peak).toBe(42);
    notePeakLand("g2", 5);
    expect(recordGame(game({ id: "g2", land: 9 }), none).peak).toBe(9);
    // A peak noted for another game never leaks in.
    notePeakLand("g3", 50);
    expect(recordGame(game({ id: "g4", land: 1 }), none).peak).toBe(1);
  });

  it("works when storage is unreadable", () => {
    localStorage.setItem("wc.best", "not json");
    expect(recordGame(game({ won: true }), { out: 2, total: 5 })).toMatchObject(
      {
        out: 2,
        total: 5,
        note: { key: "mobile.recap_first_win" },
      },
    );
  });
});

describe("rivalCount", () => {
  it("counts nations and humans that are out, not tribes or the player", () => {
    const p = (type: PlayerType, alive: boolean) => ({
      type: () => type,
      isAlive: () => alive,
    });
    const me = p(PlayerType.Human, true);
    const view = {
      myPlayer: () => me,
      players: () => [
        me,
        p(PlayerType.Nation, false),
        p(PlayerType.Nation, true),
        p(PlayerType.Bot, false),
        p(PlayerType.Bot, false),
      ],
    } as unknown as GameView;
    expect(rivalCount(view)).toEqual({ out: 1, total: 2 });
  });
});

describe("formatDuration", () => {
  it("is m:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(3725.4)).toBe("62:05");
  });
});

describe("commanderRecord", () => {
  const maps = ["europe", "mars"];
  const play = (map: string, won: boolean, seconds = 600) =>
    recordGame(game({ id: `${map}${seconds}${won}`, map, won, seconds }), none);

  it("is null before the first finished game", () => {
    expect(commanderRecord(maps, 0)).toBeNull();
  });

  it("counts wins, the fastest win and the maps won", () => {
    play("europe", false);
    expect(commanderRecord(maps, 0)).toMatchObject({ wins: 0, title: null });
    play("europe", true, 500);
    play("europe", true, 400);
    const r = commanderRecord(maps, 0)!;
    expect([r.wins, r.best, [...r.won]]).toEqual([2, 400, ["europe"]]);
    expect(r.title?.key).toBe("mobile.title_victor");
  });

  it("titles are earned, highest first", () => {
    play("europe", true);
    expect(commanderRecord(maps, 7)?.title?.key).toBe("mobile.title_unbroken");
    play("europe", true, 500);
    play("europe", true, 400);
    expect(commanderRecord(maps, 7)?.title).toEqual({
      key: "mobile.title_warlord",
      params: { map: "europe" },
    });
    play("mars", true);
    expect(commanderRecord(maps, 0)?.title?.key).toBe("mobile.title_conqueror");
  });

  it("an old record with a win time counts one win", () => {
    localStorage.setItem(
      "wc.best",
      JSON.stringify({
        europe: { games: 3, win: 300, longest: 900, peak: 80 },
      }),
    );
    expect(commanderRecord(maps, 0)?.wins).toBe(1);
  });
});
