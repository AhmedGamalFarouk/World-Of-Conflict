// @vitest-environment node
import { GameConfigSchema } from "@openfront/engine-api/Schemas";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CURATED_MAP_IDS } from "../../../src/client/mobile/CuratedMaps";
import {
  QUICK_GAME_BOTS,
  QUICK_GAME_MAP_IDS,
  quickGameConfig,
} from "../../../src/client/mobile/QuickGame";

const mapBin = (id: string) =>
  fs.statSync(path.join("resources", "maps", id.toLowerCase(), "map.bin")).size;

describe("quick game", () => {
  it("uses the three smallest curated maps by map.bin", () => {
    const smallest = [...CURATED_MAP_IDS]
      .sort((a, b) => mapBin(a) - mapBin(b))
      .slice(0, 3);
    expect([...QUICK_GAME_MAP_IDS].sort()).toEqual(smallest.sort());
  });

  it("builds a valid config with 5 bots on one of those maps", () => {
    for (const r of [0, 0.5, 0.999]) {
      const config = quickGameConfig(() => r);
      expect(GameConfigSchema.safeParse(config).success).toBe(true);
      expect(config.bots).toBe(QUICK_GAME_BOTS);
    }
    const picked = new Set(
      [0, 0.4, 0.8].map((r) => quickGameConfig(() => r).gameMap),
    );
    expect(picked.size).toBe(3);
  });
});
