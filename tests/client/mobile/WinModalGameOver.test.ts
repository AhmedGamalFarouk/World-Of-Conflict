import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/client/hud/layers/WinModal";
import type { WinModal } from "../../../src/client/hud/layers/WinModal";
import { GameOverEvent } from "../../../src/client/mobile/SaveEvents";

vi.mock("../../../src/client/Api", () => ({
  getUserMe: vi.fn(async () => null),
}));
vi.mock("../../../src/client/Cosmetics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/client/Cosmetics")>()),
  fetchCosmetics: vi.fn(async () => null),
  resolveCosmetics: vi.fn(() => []),
}));
vi.mock("../../../src/client/GamePortal", () => ({
  gamePortal: { happytime: vi.fn(), gameplayStop: vi.fn() },
}));

describe("WinModal offline", () => {
  let modal: WinModal;
  const emit = vi.fn();

  beforeEach(() => {
    vi.stubEnv("MODE", "mobile");
    localStorage.clear();
    emit.mockClear();
    modal = document.createElement("win-modal") as WinModal;
    Object.assign(modal, {
      game: {
        ticks: () => 600,
        gameID: () => "test-game",
        myPlayer: () => ({ isAlive: () => false }),
        players: () => [],
        config: () => ({ gameConfig: () => ({}) }),
      },
      eventBus: { emit },
    });
  });

  afterEach(() => {
    modal.remove();
    vi.unstubAllEnvs();
  });

  it("an elimination ends the game once, so the save is cleared", async () => {
    await modal.show();
    await modal.show();
    const overs = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e instanceof GameOverEvent);
    expect(overs).toHaveLength(1);
    expect(overs[0].reason).toBe("loss");
  });

  it("a win says win", async () => {
    (modal as unknown as { isWin: boolean }).isWin = true;
    await modal.show();
    const over = emit.mock.calls
      .map((c) => c[0])
      .find((e) => e instanceof GameOverEvent);
    expect(over?.reason).toBe("win");
  });
});
