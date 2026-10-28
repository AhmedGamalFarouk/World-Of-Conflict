import { Difficulty, GameMapType } from "@openfront/engine-api/game/GameTypes";
import { render } from "lit";
import { afterEach, describe, expect, it } from "vitest";
import { soloSummary } from "../../../src/client/mobile/SoloSummary";

const show = (input: Parameters<typeof soloSummary>[0]) => {
  const root = document.body.appendChild(document.createElement("div"));
  render(soloSummary(input), root);
  return {
    name: root.querySelector(".wc-solo-map")?.textContent?.trim(),
    img: root.querySelector("img")?.getAttribute("src") ?? "",
    values: [...root.querySelectorAll("dd")].map((d) => d.textContent?.trim()),
  };
};

describe("soloSummary", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows the map thumbnail, name, tribes and difficulty", () => {
    const card = show({
      map: GameMapType.Europe,
      random: false,
      bots: 400,
      difficulty: Difficulty.Hard,
    });
    expect(card.name).toBe("map.europe");
    expect(card.img).toContain("europe/thumbnail.webp");
    expect(card.values).toEqual(["400", "difficulty.hard"]);
  });

  it("names Random and says Disabled for no tribes or no nations", () => {
    const card = show({
      map: GameMapType.World,
      random: true,
      bots: 0,
      difficulty: null,
    });
    expect(card.name).toBe("map.random");
    expect(card.img).toContain("RandomMap.webp");
    expect(card.values).toEqual(["common.disabled", "common.disabled"]);
  });
});
