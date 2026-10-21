import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "@openfront/engine-api/game/GameTypes";
import type { GameConfig } from "@openfront/engine-api/Schemas";
import { beforeEach, describe, expect, it } from "vitest";
import {
  rememberSoloConfig,
  requestSoloReplay,
  takeSoloReplay,
} from "../../../src/client/mobile/SoloReplay";
import { ReplaySpeedMultiplier } from "../../../src/client/utilities/ReplaySpeedMultiplier";

const config: GameConfig = {
  gameMap: GameMapType.World,
  gameMapSize: GameMapSize.Normal,
  gameMode: GameMode.FFA,
  gameType: GameType.Singleplayer,
  difficulty: Difficulty.Medium,
  nations: 10,
  bots: 20,
  donateGold: false,
  donateTroops: false,
  infiniteGold: false,
  infiniteTroops: false,
  instantBuild: false,
  randomSpawn: false,
} as GameConfig;

beforeEach(() => sessionStorage.clear());

describe("SoloReplay", () => {
  it("hands the config back once, only after a replay was requested", () => {
    rememberSoloConfig(config);
    expect(takeSoloReplay()).toBeNull();
    requestSoloReplay();
    expect(takeSoloReplay()).toMatchObject({
      config: { gameMap: GameMapType.World },
      speed: undefined,
    });
    expect(takeSoloReplay()).toBeNull();
  });

  it("carries a start speed, including fastest (0)", () => {
    rememberSoloConfig(config);
    requestSoloReplay(ReplaySpeedMultiplier.fast);
    expect(takeSoloReplay()?.speed).toBe(0.5);
    rememberSoloConfig(config);
    requestSoloReplay(ReplaySpeedMultiplier.fastest);
    expect(takeSoloReplay()?.speed).toBe(0);
  });

  it("falls back to the setup screen on an invalid stored config", () => {
    sessionStorage.setItem(
      "wc-solo-config",
      JSON.stringify({ gameMap: "Atlantis" }),
    );
    requestSoloReplay();
    expect(takeSoloReplay()).toBeNull();
    sessionStorage.setItem("wc-solo-config", "{not json");
    requestSoloReplay();
    expect(takeSoloReplay()).toBeNull();
  });
});
