import { afterEach, describe, expect, it, vi } from "vitest";
import { gamePortal } from "../../../src/client/GamePortal";
import { showInGameConfirm } from "../../../src/client/InGameModal";
import { onBackButton } from "../../../src/client/mobile/MobileBack";

afterEach(() =>
  document.querySelectorAll("confirm-dialog").forEach((d) => d.remove()),
);

describe("showInGameConfirm", () => {
  it("Android back while one is open cancels it instead of stacking a second", async () => {
    const stop = vi.spyOn(gamePortal, "gameplayStop");
    const start = vi.spyOn(gamePortal, "gameplayStart");

    const first = showInGameConfirm("Leave?");
    expect(document.querySelectorAll("confirm-dialog")).toHaveLength(1);

    await onBackButton(() => {});
    expect(await first).toBe(false);
    expect(document.querySelectorAll("confirm-dialog")).toHaveLength(0);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
