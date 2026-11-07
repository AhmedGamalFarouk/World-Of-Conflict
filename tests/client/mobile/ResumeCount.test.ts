import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const runner = fs.readFileSync(
  path.join(import.meta.dirname, "../../../src/client/ClientGameRunner.ts"),
  "utf-8",
);

describe("resume from a snapshot (createClientGame)", () => {
  const body = runner.slice(
    runner.indexOf("const snapshot = lobbyConfig.resume?.snapshot;"),
  );

  it("a snapshot that won't restore falls back to replaying every turn", () => {
    const fallback = body.slice(
      body.indexOf("} catch (e) {"),
      body.indexOf("await atlasDataLoad;"),
    );
    expect(fallback).toContain('code: "save.snapshot_restore_failed"');
    expect(fallback).toContain(
      "worker = new WorkerClient(lobbyConfig.gameStartInfo, clientID);",
    );
    // Only a restore that worked skips the turns it holds.
    expect(fallback).not.toContain("restoredTick");
    expect(body).toMatch(
      /await worker\.initialize\(\);\s*restoredTick = snapshot\?\.tick \?\? 0;/,
    );
    expect(body).toContain(
      "if (restoredTick > 0) runner.skipRestoredTurns(restoredTick);",
    );
  });
});

// The guard sits inside createClientGame, which needs a worker and a canvas;
// this pins its wiring instead. A resume was counted when the game first began.
describe("a resumed game is not counted as a new start", () => {
  it("gameStarted() runs only in the branch that is not a resume", () => {
    const at = runner.indexOf("gameStarted();");
    expect(at).toBeGreaterThan(0);
    expect(runner.indexOf("gameStarted();", at + 1)).toBe(-1);
    expect(runner.slice(at - 200, at)).toMatch(
      /if \(isMobileShell\(\) && lobbyConfig\.resume\) track\("game_resume"\);\s*else if \(isMobileShell\(\)\) \{\s*$/,
    );
  });
});
