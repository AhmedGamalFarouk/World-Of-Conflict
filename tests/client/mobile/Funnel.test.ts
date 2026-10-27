import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAnalyticsForTests } from "../../../src/client/mobile/Analytics";
import {
  resetFunnelForTests,
  trackSpawn,
  trackTutorialStep,
} from "../../../src/client/mobile/Funnel";
import { gameEnded, gameStarted } from "../../../src/client/mobile/PlayStats";

const QUEUE = "wc.analytics.queue";
const events = (): { eventName: string; props?: Record<string, unknown> }[] =>
  JSON.parse(localStorage.getItem(QUEUE) ?? "[]");
const names = () => events().map((e) => e.eventName);

beforeEach(() => {
  localStorage.clear();
  resetAnalyticsForTests();
  resetFunnelForTests();
  // Consent is on; the send fails, so events stay in the queue to read.
  localStorage.setItem("wc.analytics", "on");
  vi.stubGlobal("__WC_APTABASE_KEY__", "A-EU-1234567890");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
});
afterEach(() => vi.unstubAllGlobals());

describe("funnel events", () => {
  it("spawn: once per game, with seconds since app open", () => {
    trackSpawn("g1");
    trackSpawn("g1");
    expect(names()).toEqual(["spawn"]);
    expect(events()[0].props?.seconds).toEqual(expect.any(Number));
    trackSpawn("g2");
    expect(names()).toEqual(["spawn", "spawn"]);
  });

  it("tutorial_step: each step once as it first shows, restarted by a new game", () => {
    trackTutorialStep("spawn");
    trackTutorialStep("spawn");
    trackTutorialStep("troops");
    expect(events().map((e) => e.props?.step)).toEqual(["spawn", "troops"]);
    trackSpawn("g1"); // a new game starts the tutorial again
    trackTutorialStep("troops");
    expect(names().filter((n) => n === "tutorial_step")).toHaveLength(3);
  });

  it("second_game: sent at the second start only", () => {
    gameStarted();
    expect(names()).not.toContain("second_game");
    gameStarted();
    gameStarted();
    expect(names().filter((n) => n === "second_game")).toHaveLength(1);
  });

  it("game_end carries the land share when known", () => {
    gameEnded("win", 600, 81);
    gameEnded("abandoned", 0);
    const [win, abandoned] = events();
    expect(win.props).toEqual({ reason: "win", minutes: 10, land: 81 });
    expect(abandoned.props).toEqual({ reason: "abandoned", minutes: 0 });
  });

  it("sends nothing without consent", () => {
    localStorage.setItem("wc.analytics", "off");
    trackSpawn("g1");
    gameStarted();
    gameStarted();
    expect(events()).toEqual([]);
  });
});
