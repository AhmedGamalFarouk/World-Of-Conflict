import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeSave, memoryBackend } from "./saveFixtures";

const holder = vi.hoisted(() => ({ backend: null as unknown }));

vi.mock("../../../src/client/mobile/SaveStore", async (importOriginal) => {
  const m =
    await importOriginal<
      typeof import("../../../src/client/mobile/SaveStore")
    >();
  return {
    ...m,
    saveStore: new m.SaveStore(async () => holder.backend as never),
    // The test build is DEV; pretend to be release v0.2.1 for staleness.
    isStale: (s: { commit: string }) =>
      s.commit !== "DEV" && s.commit !== "v0.2.1",
  };
});

import {
  readErrorLog,
  resetErrorLogForTests,
} from "../../../src/client/mobile/ErrorLog";
import { onBackButton } from "../../../src/client/mobile/MobileBack";
import { readPlayStats } from "../../../src/client/mobile/PlayStats";
import {
  allowNewGame,
  CONFIRM_ID,
  confirmGone,
  continueSavedGame,
  discardSavedGame,
  dismissNotice,
  homeSave,
  loadHomeSave,
  resetHomeSaveForTests,
} from "../../../src/client/mobile/SaveHome";
import { saveStore } from "../../../src/client/mobile/SaveStore";

let mem: ReturnType<typeof memoryBackend>;

beforeEach(() => {
  localStorage.clear();
  resetErrorLogForTests();
  resetHomeSaveForTests();
  mem = memoryBackend();
  holder.backend = mem.backend;
  saveStore.resetBackendForTests();
});
afterEach(() => document.getElementById(CONFIRM_ID)?.remove());

describe("loadHomeSave", () => {
  it("shows nothing without a save", async () => {
    await loadHomeSave();
    expect(homeSave()).toEqual({ kind: "none" });
  });

  it("summarises a good save: map, elapsed game time, when it was saved", async () => {
    mem.slot.value = makeSave({ turnCount: 1830, savedAt: 123 });
    await loadHomeSave();
    expect(homeSave()).toMatchObject({
      kind: "save",
      seconds: 183,
      savedAt: 123,
    });
  });

  it("discards a save from another version, with a notice, a stat and a log entry", async () => {
    mem.slot.value = makeSave({ commit: "v0.2.0", turnCount: 600 });
    await loadHomeSave();
    expect(homeSave()).toEqual({ kind: "notice", key: "save.stale" });
    expect(mem.slot.value).toBeUndefined();
    expect(readPlayStats()?.games).toEqual([
      { seconds: 60, reason: "abandoned" },
    ]);
    expect(readErrorLog().map((e) => e.code)).toEqual(["save.stale"]);
    dismissNotice();
    expect(homeSave()).toEqual({ kind: "none" });
  });

  it("discards a damaged save the same way", async () => {
    mem.slot.value = { version: 1, junk: true };
    await loadHomeSave();
    expect(homeSave()).toEqual({ kind: "notice", key: "save.damaged" });
    expect(mem.slot.value).toBeUndefined();
    expect(readErrorLog().map((e) => e.code)).toEqual(["save.damaged"]);
  });

  it("without storage there is no CONTINUE, logged once", async () => {
    holder.backend = null;
    await loadHomeSave();
    await loadHomeSave();
    expect(homeSave()).toEqual({ kind: "none" });
    expect(
      readErrorLog().filter((e) => e.code === "save.storage_unavailable"),
    ).toHaveLength(1);
  });
});

// allowNewGame waits for the boot read first, so the dialog is a tick away.
async function askNewGame(): Promise<{ answer: Promise<boolean> }> {
  const answer = allowNewGame();
  await vi.waitFor(() =>
    expect(document.getElementById(CONFIRM_ID)).not.toBeNull(),
  );
  return { answer };
}

describe("starting a new game while a save exists", () => {
  beforeEach(async () => {
    mem.slot.value = makeSave({ turnCount: 600 });
    await loadHomeSave();
  });

  it("KEEP leaves the save alone", async () => {
    const { answer } = await askNewGame();
    document.querySelector<HTMLElement>(".wc-keep")!.click();
    expect(await answer).toBe(false);
    expect(homeSave().kind).toBe("save");
    expect(mem.slot.value).toBeDefined();
  });

  it("Android back is KEEP", async () => {
    const { answer } = await askNewGame();
    await onBackButton(() => {});
    expect(await answer).toBe(false);
    expect(document.getElementById(CONFIRM_ID)).toBeNull();
  });

  it("DISCARD clears the save and records an abandoned game", async () => {
    const { answer } = await askNewGame();
    document.querySelector<HTMLElement>(".wc-destroy")!.click();
    expect(await answer).toBe(true);
    expect(homeSave()).toEqual({ kind: "none" });
    expect(mem.slot.value).toBeUndefined();
    expect(readPlayStats()?.games).toEqual([
      { seconds: 60, reason: "abandoned" },
    ]);
  });

  it("with no save it does not ask", async () => {
    await discardSavedGame();
    expect(await allowNewGame()).toBe(true);
    expect(document.getElementById(CONFIRM_ID)).toBeNull();
  });
});

describe("a new game before the boot read finishes", () => {
  it("waits for the read, then asks about the save it finds", async () => {
    mem.slot.value = makeSave({ turnCount: 600 });
    void loadHomeSave();
    const answer = allowNewGame();
    await vi.waitFor(() =>
      expect(document.querySelector(".wc-keep")).not.toBeNull(),
    );
    document.querySelector<HTMLElement>(".wc-keep")!.click();
    expect(await answer).toBe(false);
    expect(mem.slot.value).toBeDefined();
  });
});

describe("confirmGone", () => {
  it("KEEP is the gold face, the destructive button is steel", () => {
    void confirmGone({ title: "t", body: "b", keep: "Keep", destroy: "Go" });
    expect(document.querySelector(".wc-keep")!.className).toContain(
      "wc-btn-gold",
    );
    expect(document.querySelector(".wc-destroy")!.className).toContain(
      "wc-btn-steel",
    );
  });
});

describe("continueSavedGame", () => {
  it("joins like a solo game, carrying the save, and the loading screen comes up first", async () => {
    const save = makeSave({ speed: 0.5 });
    mem.slot.value = save;
    await loadHomeSave();
    const show = vi.fn();
    const overlay = document.createElement(
      "game-starting-modal",
    ) as HTMLElement & {
      show: () => void;
    };
    overlay.show = show;
    document.body.append(overlay);
    const joined = new Promise<CustomEvent>((resolve) =>
      document.addEventListener(
        "join-lobby",
        (e) => resolve(e as CustomEvent),
        {
          once: true,
        },
      ),
    );

    await continueSavedGame();
    const event = await joined;
    overlay.remove();

    expect(show).toHaveBeenCalledOnce();
    expect(event.detail).toMatchObject({
      source: "singleplayer",
      gameID: save.gameStartInfo.gameID,
      speed: 0.5,
    });
    expect(event.detail.resume.turnCount).toBe(save.turnCount);
    // CONTINUE does not consume the save.
    expect(await saveStore.read()).not.toBeNull();
  });
});
