import { Difficulty } from "@openfront/engine-api/game/GameTypes";
import { render } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import {
  quickSetupRows,
  type QuickSetupInput,
} from "../../../src/client/mobile/QuickSetup";

const show = (input: Partial<QuickSetupInput> = {}) => {
  const picks: unknown[] = [];
  const root = document.body.appendChild(document.createElement("div"));
  render(
    quickSetupRows({
      difficulty: Difficulty.Medium,
      difficultyDisabled: false,
      bots: 400,
      onDifficulty: (d) => picks.push(d),
      onBots: (n) => picks.push(n),
      ...input,
    }),
    root,
  );
  const [diff, tribes] = [...root.querySelectorAll(".wc-quick-row")].map(
    (r) => [...r.querySelectorAll("button")],
  );
  const on = (row: HTMLButtonElement[]) =>
    row
      .filter((b) => b.getAttribute("aria-checked") === "true")
      .map((b) => b.textContent?.trim());
  return { diff, tribes, on, picks };
};

describe("quickSetupRows", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("offers all four difficulties and the tribe presets, marking the picks", () => {
    const { diff, tribes, on } = show();
    expect(diff.map((b) => b.textContent?.trim())).toEqual([
      "difficulty.easy",
      "difficulty.medium",
      "difficulty.hard",
      "difficulty.impossible",
    ]);
    expect(tribes.map((b) => b.textContent?.trim())).toEqual([
      "mobile.tribes_off",
      "100",
      "200",
      "400",
    ]);
    expect(on(diff)).toEqual(["difficulty.medium"]);
    expect(on(tribes)).toEqual(["400"]);
  });

  it("reports taps, and marks no preset for a slider value", () => {
    const { diff, tribes, on, picks } = show({ bots: 250 });
    expect(on(tribes)).toEqual([]);
    diff[3].click();
    tribes[0].click();
    expect(picks).toEqual([Difficulty.Impossible, 0]);
  });

  it("disables difficulty when the map has no nations", () => {
    const { diff, tribes } = show({ difficultyDisabled: true });
    expect(diff.every((b) => b.disabled)).toBe(true);
    expect(tribes.some((b) => b.disabled)).toBe(false);
  });
});
