import { Difficulty } from "@openfront/engine-api/game/GameTypes";
import { afterEach, describe, expect, it } from "vitest";
import {
  chooseQuickDifficulty,
  lastDifficulty,
} from "../../../src/client/mobile/QuickGame";

const buttons = () => [
  ...document.querySelectorAll<HTMLElement>(".wc-confirm button"),
];

describe("chooseQuickDifficulty", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("highlights and focuses the last pick, Medium at first", async () => {
    void chooseQuickDifficulty();
    const gold = () =>
      buttons().filter((b) => b.classList.contains("wc-btn-gold"));
    expect(gold()).toHaveLength(1);
    expect(gold()[0].textContent).toBe("difficulty.medium");
    document.body.innerHTML = "";

    const answer = chooseQuickDifficulty();
    buttons()
      .filter((b) => b.classList.contains("wc-pick"))[3]
      .click();
    expect(await answer).toBe(Difficulty.Impossible);

    void chooseQuickDifficulty();
    expect(gold()[0].textContent).toBe("difficulty.impossible");
    expect(document.activeElement).toBe(gold()[0]);
  });

  it("does not remember a cancel", async () => {
    const first = chooseQuickDifficulty();
    buttons()
      .filter((b) => b.classList.contains("wc-pick"))[0]
      .click();
    await first;
    const second = chooseQuickDifficulty();
    document.querySelector<HTMLElement>(".wc-keep")!.click();
    await second;
    void chooseQuickDifficulty();
    expect(
      buttons().find((b) => b.classList.contains("wc-btn-gold"))!.textContent,
    ).toBe("difficulty.easy");
  });

  it("offers every difficulty plus a cancel that back also clicks", () => {
    void chooseQuickDifficulty();
    expect(
      buttons().filter((b) => b.classList.contains("wc-pick")),
    ).toHaveLength(Object.values(Difficulty).length);
    expect(
      buttons().filter((b) => b.classList.contains("wc-keep")),
    ).toHaveLength(1);
  });

  it("resolves with the tapped difficulty and closes", async () => {
    const answer = chooseQuickDifficulty();
    const hard = buttons().filter((b) => b.classList.contains("wc-pick"))[2];
    hard.click();
    expect(await answer).toBe(Difficulty.Hard);
    expect(document.querySelector(".wc-confirm")).toBeNull();
  });

  it("lastDifficulty: Medium until a pick, then the pick; junk falls back", async () => {
    expect(lastDifficulty()).toBe(Difficulty.Medium);
    const answer = chooseQuickDifficulty();
    buttons()
      .filter((b) => b.classList.contains("wc-pick"))[2]
      .click();
    await answer;
    expect(lastDifficulty()).toBe(Difficulty.Hard);
    localStorage.setItem("wc-quick-difficulty", "Nonsense");
    expect(lastDifficulty()).toBe(Difficulty.Medium);
  });

  it("resolves null on cancel", async () => {
    const answer = chooseQuickDifficulty();
    document.querySelector<HTMLElement>(".wc-keep")!.click();
    expect(await answer).toBeNull();
  });
});
