import { MessageType } from "@openfront/engine-api/game/GameTypes";
import { GameUpdateType } from "@openfront/engine-api/game/GameUpdates";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ATTACK_COOLDOWN_TICKS,
  CriticalEventPlate,
  PLATE_ID,
  PlateGate,
  SHOW_MS,
  truncateName,
} from "../../../src/client/mobile/CriticalEventPlate";
import { onBackButton } from "../../../src/client/mobile/MobileBack";

describe("PlateGate", () => {
  it("lets a nuke replace an attack, but an attack never replaces a nuke", () => {
    const g = new PlateGate();
    expect(g.offer("attack", 0, "a1")).toBe(true);
    expect(g.offer("nuke", 1)).toBe(true);
    expect(g.offer("attack", 500, "a2")).toBe(false);
    expect(g.offer("betrayal", 501)).toBe(false);
    expect(g.offer("nuke", 502)).toBe(true);
  });

  it("order is nuke > betrayal > attack, equal priority replaces", () => {
    const g = new PlateGate();
    expect(g.offer("betrayal", 0)).toBe(true);
    expect(g.offer("betrayal", 1)).toBe(true);
    expect(g.offer("attack", 1000, "a")).toBe(false);
    expect(g.offer("nuke", 1000)).toBe(true);
  });

  it("allows one attack plate per 10 s of game ticks", () => {
    const g = new PlateGate();
    expect(g.offer("attack", 1000, "a1")).toBe(true);
    g.clear();
    expect(g.offer("attack", 1000 + ATTACK_COOLDOWN_TICKS - 1, "a2")).toBe(
      false,
    );
    g.clear();
    expect(g.offer("attack", 1000 + ATTACK_COOLDOWN_TICKS, "a3")).toBe(true);
  });

  it("an attack id never triggers twice, even when it got no plate", () => {
    const g = new PlateGate();
    expect(g.offer("attack", 0, "a1")).toBe(true);
    g.clear();
    expect(g.offer("attack", 5000, "a1")).toBe(false);
    // a1 was suppressed by the rate limit below; it must not come back later.
    expect(g.offer("attack", 5001, "a2")).toBe(true);
    g.clear();
    expect(g.offer("attack", 5002, "a3")).toBe(false);
    expect(g.offer("attack", 9000, "a3")).toBe(false);
  });

  it("a new event after the plate left shows again", () => {
    const g = new PlateGate();
    expect(g.offer("nuke", 0)).toBe(true);
    g.clear();
    expect(g.offer("betrayal", 1)).toBe(true);
  });
});

describe("truncateName", () => {
  it("cuts after 18 characters with an ellipsis", () => {
    expect(truncateName("short")).toBe("short");
    expect(truncateName("a".repeat(18))).toBe("a".repeat(18));
    expect(truncateName("a".repeat(19))).toBe("a".repeat(18) + "…");
  });
});

function fakeGame(over: {
  attacks?: { id: string; attackerID: number; retreating: boolean }[];
  updates?: Record<number, unknown[]>;
  tick?: number;
  catchingUp?: () => boolean;
}) {
  const me = {
    isAlive: () => true,
    smallID: () => 1,
    incomingAttacks: () => over.attacks ?? [],
  };
  const other = { isPlayer: () => true, displayName: () => "Rival" };
  const game = {
    myPlayer: () => me,
    ticks: () => over.tick ?? 0,
    isCatchingUp: over.catchingUp ?? (() => false),
    updatesSinceLastTick: () => over.updates ?? {},
    playerBySmallID: (id: number) => (id === 1 ? me : other),
    unit: () => ({ owner: () => other }),
  };
  return game as never;
}

describe("CriticalEventPlate", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.getElementById(PLATE_ID)?.remove();
  });

  it("shows an attack plate once, hides after 4 s, vibrates once", () => {
    const shown = vi.fn();
    const attacks = [{ id: "x", attackerID: 2, retreating: false }];
    const plate = new CriticalEventPlate(fakeGame({ attacks }), shown);
    plate.tick();
    plate.tick();
    const el = document.getElementById(PLATE_ID)!;
    expect(el.textContent).toBe("event_plate.attack");
    expect(el.getAttribute("aria-live")).toBe("polite");
    expect(shown).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(SHOW_MS);
    expect(document.getElementById(PLATE_ID)).toBeNull();
  });

  it("a nuke aimed at the local player is assertive; Android back dismisses it first", async () => {
    const updates = {
      [GameUpdateType.UnitIncoming]: [
        { unitID: 9, playerID: 1, messageType: MessageType.NUKE_INBOUND },
        { unitID: 10, playerID: 7, messageType: MessageType.NUKE_INBOUND },
      ],
    };
    new CriticalEventPlate(fakeGame({ updates })).tick();
    const el = document.getElementById(PLATE_ID)!;
    expect(el.getAttribute("aria-live")).toBe("assertive");
    expect(document.querySelectorAll(`#${PLATE_ID}`)).toHaveLength(1);
    await onBackButton(() => {});
    expect(document.getElementById(PLATE_ID)).toBeNull();
  });

  it("shows a betrayal only for the betrayed local player", () => {
    const mk = (betrayedID: number) =>
      fakeGame({
        updates: {
          [GameUpdateType.BrokeAlliance]: [{ traitorID: 2, betrayedID }],
        },
      });
    new CriticalEventPlate(mk(5)).tick();
    expect(document.getElementById(PLATE_ID)).toBeNull();
    new CriticalEventPlate(mk(1)).tick();
    expect(document.getElementById(PLATE_ID)).not.toBeNull();
  });

  it("stays silent while a resumed game catches up, and for attacks already under way", () => {
    let catching = true;
    const shown = vi.fn();
    const attacks = [{ id: "old", attackerID: 2, retreating: false }];
    const plate = new CriticalEventPlate(
      fakeGame({ attacks, catchingUp: () => catching }),
      shown,
    );
    plate.tick();
    expect(document.getElementById(PLATE_ID)).toBeNull();
    catching = false;
    plate.tick();
    plate.tick();
    expect(document.getElementById(PLATE_ID)).toBeNull();
    expect(shown).not.toHaveBeenCalled();
  });

  it("stays silent until the saved turns have all run", () => {
    const attacks = [{ id: "x", attackerID: 2, retreating: false }];
    const early = new CriticalEventPlate(
      fakeGame({ attacks, tick: 50 }),
      () => {},
      100,
    );
    early.tick();
    expect(document.getElementById(PLATE_ID)).toBeNull();
  });

  it("ignores retreating attacks", () => {
    const attacks = [{ id: "r", attackerID: 2, retreating: true }];
    new CriticalEventPlate(fakeGame({ attacks })).tick();
    expect(document.getElementById(PLATE_ID)).toBeNull();
  });
});
