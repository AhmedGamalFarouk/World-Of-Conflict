import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameMapType, GameType } from "@openfront/engine-api/game/GameTypes";
import { EventBus } from "@openfront/shared/EventBus";
import "../../src/client/hud/layers/ControlPanel";
import type { ControlPanel } from "../../src/client/hud/layers/ControlPanel";
import "../../src/client/hud/layers/GameRightSidebar";
import type { GameRightSidebar } from "../../src/client/hud/layers/GameRightSidebar";
import { showInGameConfirm } from "../../src/client/InGameModal";
import { aboutBack, openAbout } from "../../src/client/mobile/About";
import { SOURCE_URL } from "../../src/client/mobile/AppInfo";
import {
  fatalForHeading,
  GL_LOST,
  isFatalShown,
  showFatal,
} from "../../src/client/mobile/FatalScreen";
import {
  MOBILE_BACK_EVENT,
  onBackButton,
} from "../../src/client/mobile/MobileBack";
import {
  installOfflineNetworkGuard,
  isMapAvailable,
  isOffline,
} from "../../src/client/mobile/MobileShell";
import {
  gameFinished,
  gameStarted,
  readPlayStats,
} from "../../src/client/mobile/PlayStats";
import { PauseGameIntentEvent } from "../../src/client/Transport";
import type { UIState } from "../../src/client/UIState";
import { UserSettings } from "../../src/client/UserSettings";
import type { GameView } from "../../src/client/view";

// Back to menu navigates to homeHref(); a hash keeps jsdom on the page.
vi.mock("../../src/client/Utils", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/client/Utils")>()),
  homeHref: () => "#menu",
}));

vi.mock("../../src/client/InGameModal", () => ({
  showInGameAlert: vi.fn(async () => {}),
  showInGameConfirm: vi.fn(async () => false),
}));

const realFetch = window.fetch;
const realSendBeacon = navigator.sendBeacon;

afterEach(() => {
  vi.unstubAllEnvs();
  window.fetch = realFetch;
  navigator.sendBeacon = realSendBeacon;
});

describe("MobileShell on the web", () => {
  it("is online, offers every map and leaves fetch alone", () => {
    expect(isOffline()).toBe(false);
    expect(isMapAvailable(GameMapType.Africa)).toBe(true);
    const fetchBefore = window.fetch;
    installOfflineNetworkGuard();
    expect(window.fetch).toBe(fetchBefore);
  });
});

describe("MobileShell in the mobile build", () => {
  beforeEach(() => vi.stubEnv("MODE", "mobile"));

  it("is offline and offers only the curated maps", () => {
    expect(isOffline()).toBe(true);
    expect(isMapAvailable(GameMapType.World)).toBe(true);
    expect(isMapAvailable(GameMapType.Africa)).toBe(false);
  });

  it("answers other origins with 503 and passes same-origin requests through", async () => {
    const inner = vi.fn(async () => new Response("map bytes"));
    window.fetch = inner as typeof fetch;

    installOfflineNetworkGuard();

    const remote = await fetch("https://api.openfront.io/users/@me");
    expect(remote.status).toBe(503);
    const remoteRequest = await fetch(
      new Request("http://localhost:8787/news.json"),
    );
    expect(remoteRequest.status).toBe(503);
    expect(inner).not.toHaveBeenCalled();

    const local = await fetch("/maps/world/map.bin");
    expect(await local.text()).toBe("map bytes");
    expect(inner).toHaveBeenCalledTimes(1);

    expect(navigator.sendBeacon("https://tracker.example/b", "x")).toBe(false);
  });
});

describe("GameRightSidebar background pause (mobile)", () => {
  let hidden = false;

  beforeEach(() => {
    vi.stubEnv("MODE", "mobile");
    hidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
  });

  function mount(opts: { spawnPhase?: boolean; alive?: boolean } = {}) {
    const el = document.createElement("game-right-sidebar") as GameRightSidebar;
    const config = {
      gameConfig: () => ({ gameType: GameType.Singleplayer }),
      doomsdayClockConfig: () => ({ enabled: false }),
      overtimeConfig: () => ({ enabled: false, startMinutes: 0 }),
      isReplay: () => false,
      listed: false,
    };
    el.game = {
      config: () => config,
      inSpawnPhase: () => opts.spawnPhase ?? false,
      elapsedGameSeconds: () => 0,
      myPlayer: () =>
        opts.alive ? ({ isAlive: () => true } as unknown) : undefined,
      gameID: () => "test-game",
    } as unknown as GameView;
    const eventBus = new EventBus();
    el.eventBus = eventBus;
    document.body.appendChild(el);
    el.init();
    const pauses: boolean[] = [];
    eventBus.on(PauseGameIntentEvent, (e) => pauses.push(e.paused));
    return { eventBus, pauses };
  }

  function setHidden(value: boolean) {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
  }

  it("pauses when the app goes to the background and resumes on return", () => {
    const { pauses } = mount();
    setHidden(true);
    setHidden(false);
    expect(pauses).toEqual([true, false]);
  });

  it("leaves a pause the player chose in place", () => {
    const { eventBus, pauses } = mount();
    eventBus.emit(new PauseGameIntentEvent(true));
    setHidden(true);
    setHidden(false);
    expect(pauses).toEqual([true]);
  });

  it("does nothing during the spawn phase", () => {
    const { pauses } = mount({ spawnPhase: true });
    setHidden(true);
    setHidden(false);
    expect(pauses).toEqual([]);
  });

  it("Android back opens the pause overlay, and back again resumes", async () => {
    const { pauses } = mount({ alive: true });
    document.body.classList.add("in-game");
    await onBackButton(() => {});
    await vi.waitFor(() => expect(pauses).toEqual([true]));
    await onBackButton(() => {});
    await vi.waitFor(() => expect(pauses).toEqual([true, false]));
    expect(showInGameConfirm).not.toHaveBeenCalled();
  });

  it("Android back asks before leaving when no pause is possible", async () => {
    vi.mocked(showInGameConfirm).mockResolvedValueOnce(false);
    const { pauses } = mount({ alive: true, spawnPhase: true });
    document.body.classList.add("in-game");
    await onBackButton(() => {});
    await vi.waitFor(() =>
      expect(showInGameConfirm).toHaveBeenCalledWith(
        "help_modal.exit_confirmation",
      ),
    );
    expect(pauses).toEqual([]);
  });
});

describe("ControlPanel send rail (mobile)", () => {
  beforeEach(() => vi.stubEnv("MODE", "mobile"));

  it("snaps a drag to the nearest stop and stores it", async () => {
    const panel = document.createElement("control-panel") as ControlPanel;
    panel.uiState = { attackRatio: 0.2 } as UIState;
    (panel as unknown as { _isVisible: boolean })._isVisible = true;
    document.body.appendChild(panel);
    await panel.updateComplete;

    const rail = panel.querySelector<HTMLElement>(".wc-rail")!;
    const track = panel.querySelector<HTMLElement>(".wc-rail-track")!;
    track.getBoundingClientRect = () =>
      ({ top: 100, height: 200, left: 0, width: 50 }) as DOMRect;
    rail.setPointerCapture = () => {};
    // 60% down the track: the third of four stops (100/75/50/25).
    rail.dispatchEvent(
      new PointerEvent("pointerdown", { clientY: 220, bubbles: true }),
    );
    await panel.updateComplete;

    expect(panel.uiState.attackRatio).toBe(0.5);
    expect(new UserSettings().attackRatio()).toBe(0.5);
    expect(rail.querySelector(".wc-on")?.textContent?.trim()).toBe("50");
    panel.remove();
  });
});

describe("Android back on the home screen", () => {
  beforeEach(() => {
    document.body.classList.remove("in-game");
    window.location.hash = "";
    vi.mocked(showInGameConfirm).mockClear();
  });

  it("closes the open page with Escape instead of asking", async () => {
    window.location.hash = "#modal=settings";
    const keys: string[] = [];
    const onKey = (e: KeyboardEvent) => keys.push(e.key);
    window.addEventListener("keydown", onKey);
    const exit = vi.fn();
    await onBackButton(exit);
    window.removeEventListener("keydown", onKey);
    expect(keys).toEqual(["Escape"]);
    expect(showInGameConfirm).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("exits the app only once the player confirms", async () => {
    const exit = vi.fn();
    vi.mocked(showInGameConfirm).mockResolvedValueOnce(false);
    await onBackButton(exit);
    expect(exit).not.toHaveBeenCalled();
    vi.mocked(showInGameConfirm).mockResolvedValueOnce(true);
    await onBackButton(exit);
    expect(exit).toHaveBeenCalledOnce();
  });
});

describe("fatal screen", () => {
  afterEach(() => document.getElementById("wc-fatal")?.remove());

  it("ends the game only for the two errors that mean it is over", () => {
    expect(
      fatalForHeading(
        "error_modal.connection_error",
        "Failed to load /maps/x/map.bin: Not Found",
      )?.code,
    ).toBe("WC-E01");
    expect(
      fatalForHeading("error_modal.connection_error", "Unknown map: Atlantis")
        ?.code,
    ).toBe("WC-E01");
    expect(
      fatalForHeading("error_modal.connection_error", "worker init failed")
        ?.code,
    ).toBe("WC-E04");
    expect(fatalForHeading("error_modal.crashed", "boom")?.code).toBe("WC-E02");
    // Informational or online-only: upstream's modal stays.
    expect(
      fatalForHeading("error_modal.spawn_failed.title", "spawn_failed"),
    ).toBeNull();
    expect(fatalForHeading("error_modal.desync_notice", "desync")).toBeNull();
  });

  it("shows the code, a short detail and the version, once", () => {
    showFatal(GL_LOST, "x".repeat(300));
    showFatal(GL_LOST, "second error");
    const screens = document.querySelectorAll("#wc-fatal");
    expect(screens).toHaveLength(1);
    const detail = screens[0].querySelector(".wc-fatal-detail")!.textContent!;
    expect(detail.startsWith("WC-E03 · ")).toBe(true);
    expect(detail.endsWith(" · dev")).toBe(true);
    expect(detail).not.toContain("x".repeat(120));
    expect(isFatalShown()).toBe(true);
    expect(document.activeElement?.classList.contains("wc-fatal-back")).toBe(
      true,
    );
  });

  it("copies the details a tester can paste", async () => {
    const writeText = vi.fn(async (_text: string) => {});
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    showFatal(GL_LOST, "GL restore timeout 3000ms", "stack line");
    document.querySelector<HTMLButtonElement>(".wc-fatal-copy")!.click();
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    const copied = JSON.parse(writeText.mock.calls[0][0]);
    expect(copied).toMatchObject({
      code: "WC-E03",
      version: "dev",
      message: "GL restore timeout 3000ms",
      stack: "stack line",
    });
  });
});

describe("About", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    document.querySelector("wc-about")?.remove();
    vi.restoreAllMocks();
  });

  async function openAboutScreen() {
    openAbout();
    const el = document.querySelector("wc-about") as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    await el.updateComplete;
    return el;
  }

  it("marks a dev build and hides the games line before the first game", async () => {
    const el = await openAboutScreen();
    expect(el.querySelector(".wc-about-dev")).not.toBeNull();
    expect(el.textContent).not.toContain("mobile.about_games");
    expect(el.querySelector(".wc-btn-gold")?.getAttribute("href")).toBe(
      SOURCE_URL,
    );
  });

  it("shows the play counter once games were played", async () => {
    gameStarted();
    gameStarted();
    gameFinished();
    expect(readPlayStats()).toMatchObject({ started: 2, finished: 1 });
    const el = await openAboutScreen();
    expect(el.querySelector(".wc-about-body")!.textContent).toMatch(
      /2.*1|about_games/,
    );
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => gameStarted()).not.toThrow();
    expect(readPlayStats()).toBeNull();
  });

  it("shows the license list, or why it couldn't", async () => {
    window.fetch = vi.fn(async () => new Response("lit\nzod")) as typeof fetch;
    const el = await openAboutScreen();
    el.querySelector<HTMLButtonElement>("button.wc-about-link")!.click();
    await vi.waitFor(() =>
      expect(el.querySelector(".wc-about-pre")?.textContent).toBe("lit\nzod"),
    );

    aboutBack();
    window.fetch = vi.fn(
      async () => new Response(null, { status: 404 }),
    ) as typeof fetch;
    await (el as unknown as { updateComplete: Promise<unknown> })
      .updateComplete;
    el.querySelector<HTMLButtonElement>("button.wc-about-link")!.click();
    await vi.waitFor(() => expect(el.textContent).toContain("HTTP 404"));
  });
});

describe("Android back with the mobile overlays", () => {
  beforeEach(() => {
    document.body.classList.remove("in-game");
    window.location.hash = "";
    vi.mocked(showInGameConfirm).mockClear();
  });
  afterEach(() => {
    document.querySelector("wc-about")?.remove();
    document.getElementById("wc-fatal")?.remove();
  });

  it("closes the licenses pane, then About, before anything else", async () => {
    window.fetch = vi.fn(async () => new Response("lit")) as typeof fetch;
    openAbout();
    const el = document.querySelector("wc-about") as HTMLElement & {
      updateComplete: Promise<unknown>;
      isOpen: boolean;
    };
    await el.updateComplete;
    el.querySelector<HTMLButtonElement>("button.wc-about-link")!.click();
    await vi.waitFor(() =>
      expect(el.querySelector(".wc-about-pre")).not.toBeNull(),
    );

    const exit = vi.fn();
    await onBackButton(exit);
    await el.updateComplete;
    expect(el.querySelector(".wc-about-pre")).toBeNull();
    expect(el.isOpen).toBe(true);

    await onBackButton(exit);
    expect(el.isOpen).toBe(false);
    expect(showInGameConfirm).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("leaves the game from the fatal screen, even in a game", async () => {
    document.body.classList.add("in-game");
    const sidebarBack = vi.fn();
    window.addEventListener(MOBILE_BACK_EVENT, sidebarBack);
    showFatal(GL_LOST, "x");
    await onBackButton(vi.fn());
    window.removeEventListener(MOBILE_BACK_EVENT, sidebarBack);
    expect(sidebarBack).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#menu");
  });
});
