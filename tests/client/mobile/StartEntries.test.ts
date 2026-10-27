import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const src = (p: string) =>
  fs.readFileSync(
    path.join(import.meta.dirname, "../../../src/client", p),
    "utf-8",
  );

// Every way to begin a new game on the phone must ask before it replaces a
// saved one. Play again and QUICK GAME end in the solo modal's START, so that
// is covered by the same call.
describe("new game entries ask before replacing a save", () => {
  const selector = src("GameModeSelector.ts");
  const method = (name: string) =>
    selector.slice(selector.indexOf(`private ${name} =`)).split("};")[0];

  it("PLAY, CUSTOM GAME and TUTORIAL", () => {
    for (const name of ["playOffline", "customGameOffline", "startTutorial"]) {
      expect(method(name), name).toContain("allowNewGame()");
    }
    expect(selector).toMatch(/@click=\$\{this\.playOffline\}/);
    expect(selector).toMatch(/@click=\$\{this\.customGameOffline\}/);
  });

  it("PLAY is one tap: a quick game at the remembered difficulty", () => {
    expect(method("playOffline")).toContain("startQuickGame(lastDifficulty())");
    expect(method("playOffline")).not.toContain("chooseQuickDifficulty");
    // The chip only changes the difficulty; it never starts a game.
    expect(method("pickQuickDifficulty")).not.toMatch(/startQuickGame|allow/);
  });

  it("START in the solo modal (also Play again and QUICK GAME's start)", () => {
    const solo = src("SinglePlayerModal.ts");
    const start = solo.slice(solo.indexOf("private async startGame()"));
    expect(start.slice(0, 600)).toMatch(
      /isOffline\(\) && !\(await allowNewGame\(\)\)/,
    );
  });
});
