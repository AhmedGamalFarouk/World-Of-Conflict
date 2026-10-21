import { GameType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../../src/client/hud/layers/GameRightSidebar";
import type { GameRightSidebar } from "../../../src/client/hud/layers/GameRightSidebar";
import { openAbout } from "../../../src/client/mobile/About";
import {
  AutoSaver,
  setActiveAutoSaver,
} from "../../../src/client/mobile/AutoSave";
import {
  readErrorLog,
  resetErrorLogForTests,
} from "../../../src/client/mobile/ErrorLog";
import { gameEnded, readPlayStats } from "../../../src/client/mobile/PlayStats";
import { GameResumedEvent } from "../../../src/client/mobile/SaveEvents";
import { CONFIRM_ID } from "../../../src/client/mobile/SaveHome";
import { SaveStore } from "../../../src/client/mobile/SaveStore";
import { PauseGameIntentEvent } from "../../../src/client/Transport";
import type { GameView } from "../../../src/client/view";
import { makeSave, memoryBackend } from "./saveFixtures";

type Updatable = HTMLElement & { updateComplete: Promise<unknown> };

describe("About", () => {
  beforeEach(() => {
    localStorage.clear();
    resetErrorLogForTests();
  });
  afterEach(() => {
    document.querySelector("wc-about")?.remove();
    vi.restoreAllMocks();
  });

  async function show() {
    openAbout();
    const el = document.querySelector("wc-about") as Updatable;
    await el.updateComplete;
    return el;
  }

  const copyButton = (el: HTMLElement) =>
    [...el.querySelectorAll<HTMLButtonElement>("button.wc-about-link")].find(
      (b) => b.textContent?.includes("about_copy_log"),
    )!;

  it("hides the median line below 3 won or lost games, marks it provisional below 10", async () => {
    gameEnded("win", 600);
    gameEnded("loss", 600);
    let el = await show();
    expect(el.textContent).not.toContain("about_median");
    el.remove();

    gameEnded("win", 600);
    el = await show();
    expect(el.textContent).toContain("mobile.about_median_provisional");
  });

  it("Copy error log copies the header and entries, then toasts the count", async () => {
    const write = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: write },
    });
    const el = await show();
    copyButton(el).click();
    await vi.waitFor(() => expect(write).toHaveBeenCalledOnce());
    const text = (write.mock.calls[0] as unknown as [string])[0];
    expect(text).toContain("No errors logged");
    await el.updateComplete;
    expect(el.textContent).toContain("mobile.about_log_copied");
  });

  it("opens a selectable panel and logs when the clipboard refuses", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    const el = await show();
    copyButton(el).click();
    await vi.waitFor(() =>
      expect(el.querySelector(".wc-about-pre")).not.toBeNull(),
    );
    expect(el.querySelector(".wc-about-pre")!.textContent).toContain(
      "World Of Conflict",
    );
    expect(readErrorLog().map((e) => e.code)).toContain(
      "errlog.clipboard_failed",
    );
  });
});

describe("pause card (mobile)", () => {
  beforeEach(() => {
    vi.stubEnv("MODE", "mobile");
    localStorage.clear();
    document.querySelectorAll(`#${CONFIRM_ID}`).forEach((e) => e.remove());
  });
  afterEach(() => {
    setActiveAutoSaver(null);
    document.querySelector("game-right-sidebar")?.remove();
    vi.unstubAllEnvs();
  });

  async function mount() {
    const el = document.createElement(
      "game-right-sidebar",
    ) as GameRightSidebar & Updatable;
    const config = {
      gameConfig: () => ({ gameType: GameType.Singleplayer }),
      doomsdayClockConfig: () => ({ enabled: false }),
      overtimeConfig: () => ({ enabled: false, startMinutes: 0 }),
      isReplay: () => false,
      listed: false,
    };
    el.game = {
      config: () => config,
      inSpawnPhase: () => false,
      elapsedGameSeconds: () => 0,
      myPlayer: () => undefined,
      gameID: () => "g",
      ticks: () => 600,
      isCatchingUp: () => false,
    } as unknown as GameView;
    const bus = new EventBus();
    el.eventBus = bus;
    document.body.appendChild(el);
    el.init();
    const pauses: boolean[] = [];
    bus.on(PauseGameIntentEvent, (e) => pauses.push(e.paused));
    return { el, bus, pauses };
  }

  function activeSaver() {
    const mem = memoryBackend();
    const store = new SaveStore(async () => mem.backend);
    const saver = new AutoSaver(
      {
        turns: () => [],
        gameStartInfo: makeSave().gameStartInfo,
        clientID: "c1",
        speed: () => 1,
        hashes: () => [],
      },
      store,
      600,
    );
    setActiveAutoSaver(saver);
    return { saver, store, mem };
  }

  it("a resumed game opens paused under a RESUMED header, until the first RESUME", async () => {
    const { el, bus } = await mount();
    bus.emit(new GameResumedEvent(1830, Date.now() - 3 * 60_000));
    await el.updateComplete;
    expect(el.querySelector(".wc-pause-card")).not.toBeNull();
    const header = el.querySelector(".wc-resumed")!.textContent;
    expect(header).toContain("save.resumed_header");

    el.querySelector<HTMLButtonElement>(".wc-pause-resume")!.click();
    await el.updateComplete;
    expect(el.querySelector(".wc-pause-card")).toBeNull();
  });

  it("shows the three exits: RESUME gold, EXIT TO HOME and ABANDON steel", async () => {
    activeSaver();
    const { el, bus } = await mount();
    bus.emit(new GameResumedEvent(10, Date.now()));
    await el.updateComplete;
    const labels = [...el.querySelectorAll(".wc-pause-card button")].map((b) =>
      b.textContent!.trim(),
    );
    expect(labels).toContain("save.exit_home");
    expect(labels).toContain("save.abandon");
    expect(el.querySelector(".wc-pause-resume")!.className).toContain(
      "wc-btn-gold",
    );
  });

  it("says 'Saving paused' after three failed saves, 'Saved N s ago' otherwise", async () => {
    const { saver, mem } = activeSaver();
    const { el, bus } = await mount();
    await saver.saveNow();
    bus.emit(new GameResumedEvent(10, Date.now()));
    await el.updateComplete;
    expect(el.querySelector(".wc-saved")!.textContent).toContain(
      "save.saved_ago",
    );
    for (let i = 0; i < 3; i++) {
      mem.failNext.put = new Error("full");
      await saver.saveNow();
    }
    el.requestUpdate();
    await el.updateComplete;
    expect(el.querySelector(".wc-saved-paused")).not.toBeNull();
  });

  it("ABANDON asks first; confirming clears the save and records a quit", async () => {
    const { saver, store } = activeSaver();
    await saver.saveNow();
    const { el, bus } = await mount();
    bus.emit(new GameResumedEvent(10, Date.now()));
    await el.updateComplete;
    // jsdom cannot navigate: stop at the confirmation and the save.
    const abandon = [
      ...el.querySelectorAll<HTMLButtonElement>(".wc-pause-card button"),
    ].find((b) => b.textContent!.includes("save.abandon"))!;
    abandon.click();
    expect(document.getElementById(CONFIRM_ID)).not.toBeNull();
    // KEEP PLAYING: nothing is lost.
    document.querySelector<HTMLElement>(".wc-keep")!.click();
    await new Promise((r) => setTimeout(r));
    expect(await store.read()).not.toBeNull();
    expect(readPlayStats()?.games ?? []).toEqual([]);
  });
});
