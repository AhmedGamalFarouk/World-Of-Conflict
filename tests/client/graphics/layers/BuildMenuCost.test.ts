import { describe, expect, it } from "vitest";

// Side-effect import: the @customElement decorator registers <build-menu>
// when the module is evaluated, and a type-only reference would not evaluate it.
import { BuildableUnit, UnitType } from "@openfront/engine-api/game/GameTypes";
import "../../../../src/client/hud/layers/BuildMenu";
import type { BuildMenu } from "../../../../src/client/hud/layers/BuildMenu";

function makeMenu(): BuildMenu {
  return document.createElement("build-menu") as BuildMenu;
}

const item = (unitType: UnitType) => ({ unitType, icon: "" }) as any;

describe("BuildMenu.cost", () => {
  it("returns the buildable's cost for a matching unit type", () => {
    const menu = makeMenu();
    menu.playerBuildables = [
      { type: UnitType.City, canBuild: true, canUpgrade: false, cost: 125n },
      { type: UnitType.Port, canBuild: false, canUpgrade: false, cost: 5n },
    ] as unknown as BuildableUnit[];

    // Skips non-matching entries before finding the match.
    expect(menu.cost(item(UnitType.Port))).toBe(5n);
    expect(menu.cost(item(UnitType.City))).toBe(125n);
  });

  it("falls back to 0 when the unit type is not buildable here", () => {
    const menu = makeMenu();
    menu.playerBuildables = [
      { type: UnitType.City, canBuild: true, canUpgrade: false, cost: 125n },
    ] as unknown as BuildableUnit[];

    expect(menu.cost(item(UnitType.Factory))).toBe(0n);
  });

  it("falls back to 0 before the buildables have arrived", () => {
    const menu = makeMenu();
    menu.playerBuildables = null;

    expect(menu.cost(item(UnitType.City))).toBe(0n);
  });
});

describe("BuildMenu disabled reason", () => {
  type World = {
    gold?: bigint;
    silos?: number;
    ports?: number;
    loaded?: number;
    immunity?: boolean;
    water?: boolean;
  };
  function reason(type: UnitType, cost: bigint, w: World = {}) {
    const menu = makeMenu() as any;
    const me = {
      gold: () => w.gold ?? 1000n,
      totalUnitLevels: (t: UnitType) =>
        t === UnitType.Port ? (w.ports ?? 0) : (w.silos ?? 0),
      readyMissileCount: () => w.loaded ?? 1,
      isOnSameTeam: () => false,
    };
    menu.game = {
      myPlayer: () => me,
      isSpawnImmunityActive: () => w.immunity ?? false,
      owner: () => ({ isPlayer: () => false }),
      isWater: () => w.water ?? true,
    };
    menu.playerBuildables = [
      { type, canBuild: false, canUpgrade: false, cost },
    ] as unknown as BuildableUnit[];
    return menu.disabledReason(type, 0) as string;
  }

  it("says how much gold is missing first", () => {
    expect(reason(UnitType.AtomBomb, 750n, { gold: 100n })).toBe(
      "build_menu.need_gold",
    );
  });

  it("walks the nuke rules in the engine's order", () => {
    expect(reason(UnitType.AtomBomb, 750n)).toBe("build_menu.need_silo");
    expect(reason(UnitType.AtomBomb, 750n, { silos: 1, loaded: 0 })).toBe(
      "build_menu.missile_reloading",
    );
    expect(reason(UnitType.AtomBomb, 750n, { silos: 1, immunity: true })).toBe(
      "build_menu.spawn_protection",
    );
  });

  it("tells a warship what it is missing", () => {
    expect(reason(UnitType.Warship, 750n)).toBe("build_menu.need_port");
    expect(reason(UnitType.Warship, 750n, { ports: 1, water: false })).toBe(
      "build_menu.need_water",
    );
    expect(reason(UnitType.Warship, 750n, { ports: 1 })).toBe(
      "build_menu.need_port_here",
    );
  });

  it("falls back to a placement message", () => {
    expect(reason(UnitType.Port, 750n, { silos: 1 })).toBe(
      "build_menu.cant_build_here",
    );
  });
});
