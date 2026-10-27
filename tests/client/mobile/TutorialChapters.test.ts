import { beforeEach, describe, expect, it } from "vitest";
import {
  STEP_DONE_LINGER_TICKS,
  TUTORIAL_STEPS,
  TutorialContext,
  TutorialProgress,
} from "../../../src/client/hud/Tutorial";
import {
  CHAPTERS,
  finishChapter,
  firstSentence,
  nextChapter,
} from "../../../src/client/mobile/TutorialChapters";

const ctx = (over: Partial<TutorialContext> = {}): TutorialContext => ({
  hasSpawned: true,
  inSpawnPhase: false,
  attacking: false,
  attackRatioMoved: false,
  boatsDisabled: false,
  boatSent: false,
  botsExist: true,
  nationsExist: true,
  alliancesDisabled: false,
  allied: false,
  gold: 0n,
  cityCost: null,
  cityDisabled: false,
  cities: 0,
  portDisabled: false,
  ports: 0,
  defensePostDisabled: false,
  defensePosts: 0,
  factoryDisabled: false,
  factories: 0,
  warshipDisabled: false,
  warships: 0,
  siloDisabled: false,
  silos: 0,
  atomDisabled: false,
  siloReady: false,
  atomLaunched: false,
  hydrogenDisabled: false,
  mirvDisabled: false,
  samDisabled: false,
  ...over,
});

beforeEach(() => localStorage.clear());

describe("chapters", () => {
  it("split every step once, in order: Expand 6, Build 8, War the rest", () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(["expand", "build", "war"]);
    expect(CHAPTERS.map((c) => c.steps.length)).toEqual([6, 8, 8]);
    expect(CHAPTERS.flatMap((c) => c.steps)).toEqual([...TUTORIAL_STEPS]);
    expect(CHAPTERS[0].steps[5].id).toBe("capture_tribes");
    expect(CHAPTERS[2].steps[0].id).toBe("buy_defense_post");
  });

  it("counts within the chapter (Expand · 2 of 6)", () => {
    const p = new TutorialProgress(CHAPTERS[0].steps);
    p.update(ctx());
    for (let i = 0; i <= STEP_DONE_LINGER_TICKS; i++) p.update(ctx());
    expect(p.current()?.id).toBe("attack_wilderness");
    expect([p.position(ctx()), p.total(ctx())]).toEqual([2, 6]);
  });

  it("one chapter per game, remembered; storage order can't go back", () => {
    expect(nextChapter()?.id).toBe("expand");
    finishChapter(CHAPTERS[0]);
    expect(nextChapter()?.id).toBe("build");
    finishChapter(CHAPTERS[0]);
    expect(nextChapter()?.id).toBe("build");
    finishChapter(CHAPTERS[1]);
    finishChapter(CHAPTERS[2]);
    expect(nextChapter()).toBeNull();
  });

  it("later chapters open when relevant", () => {
    const [expand, build, war] = CHAPTERS;
    expect(expand.opens(ctx(), null)).toBe(true);
    expect(build.opens(ctx({ gold: 99n, cityCost: 100n }), null)).toBe(false);
    expect(build.opens(ctx({ gold: 100n, cityCost: 100n }), null)).toBe(true);
    expect(build.opens(ctx({ cityDisabled: true }), null)).toBe(true);
    expect(war.opens(ctx({ gold: 10n }), null)).toBe(false);
    expect(war.opens(ctx({ gold: 10n }), 10n)).toBe(true);
    expect(war.opens(ctx({ silos: 1 }), null)).toBe(true);
  });
});

describe("firstSentence", () => {
  it("keeps the first sentence whole and says whether more follows", () => {
    expect(firstSentence("You're ready! Good luck out there.")).toEqual([
      "You're ready!",
      true,
    ]);
    expect(firstSentence("Tap anywhere on the map.")).toEqual([
      "Tap anywhere on the map.",
      false,
    ]);
    expect(firstSentence("Costs 1.5M gold. Then build.")).toEqual([
      "Costs 1.5M gold.",
      true,
    ]);
    expect(firstSentence("لا نقطة")).toEqual(["لا نقطة", false]);
    expect(firstSentence("هل أنت مستعد؟ هيا.")).toEqual([
      "هل أنت مستعد؟",
      true,
    ]);
  });
});
