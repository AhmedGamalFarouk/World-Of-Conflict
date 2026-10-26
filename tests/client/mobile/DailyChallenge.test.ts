import { maps } from "@openfront/engine-api/game/GameTypes";
import { GameConfigSchema, isValidGameID } from "@openfront/engine-api/Schemas";
import { beforeEach, describe, expect, it } from "vitest";
import { CURATED_MAP_IDS } from "../../../src/client/mobile/CuratedMaps";
import {
  DAILY_MAP_IDS,
  dailyConfig,
  dailyEnded,
  dailyId,
  dailyStatus,
} from "../../../src/client/mobile/DailyChallenge";
import {
  rememberSoloConfig,
  requestSoloReplay,
  takeSoloReplay,
} from "../../../src/client/mobile/SoloReplay";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("daily challenge", () => {
  it("derives a valid, date-only game ID and the same game for it", () => {
    const id = dailyId(at("2026-10-26"));
    expect(id).toBe("D20261026");
    expect(isValidGameID(id)).toBe(true);
    expect(dailyConfig(id)).toEqual(dailyConfig(id));
    expect(GameConfigSchema.safeParse(dailyConfig(id)).success).toBe(true);
  });

  it("only picks curated maps, and rotates through them", () => {
    for (const id of DAILY_MAP_IDS) expect(CURATED_MAP_IDS).toContain(id);
    const picked = new Set<unknown>();
    for (let d = 1; d <= 28; d++) {
      const day = String(d).padStart(2, "0");
      picked.add(dailyConfig(dailyId(at(`2026-11-${day}`))).gameMap);
    }
    expect(picked.size).toBeGreaterThan(5);
    for (const m of picked) expect(maps.some((x) => x.type === m)).toBe(true);
  });

  it("counts a streak of consecutive finished days, keeps first result", () => {
    dailyEnded("D20261024", "win", 300);
    dailyEnded("D20261025", "loss", 200);
    // Today not played yet: the streak is alive through yesterday.
    expect(dailyStatus(at("2026-10-26"))).toEqual({
      doneToday: false,
      streak: 2,
    });
    dailyEnded("D20261026", "win", 100);
    dailyEnded("D20261026", "loss", 999);
    expect(dailyStatus(at("2026-10-26"))).toEqual({
      doneToday: true,
      streak: 3,
    });
    expect(JSON.parse(localStorage.getItem("wc.daily")!)["2026-10-26"]).toEqual(
      { result: "win", seconds: 100 },
    );
    // A missed day breaks it.
    expect(dailyStatus(at("2026-10-28")).streak).toBe(0);
  });

  it("ignores random game IDs and damaged storage", () => {
    dailyEnded("aB3dEf9h", "win", 10);
    expect(localStorage.getItem("wc.daily")).toBeNull();
    localStorage.setItem("wc.daily", "{nope");
    expect(dailyStatus(at("2026-10-26"))).toEqual({
      doneToday: false,
      streak: 0,
    });
  });

  it("pins the game ID through the replay hand-off, once", () => {
    rememberSoloConfig(dailyConfig("D20261026"));
    requestSoloReplay(undefined, "D20261026");
    expect(takeSoloReplay()?.gameID).toBe("D20261026");
    rememberSoloConfig(dailyConfig("D20261026"));
    requestSoloReplay();
    expect(takeSoloReplay()?.gameID).toBeUndefined();
  });
});
