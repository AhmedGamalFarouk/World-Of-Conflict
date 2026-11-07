import {
  GameUpdateType,
  GameUpdateViewData,
  RailroadConstructionUpdate,
  RailroadDestructionUpdate,
  RailroadSnapUpdate,
  SpawnPhaseEndUpdate,
  UnitUpdate,
} from "@openfront/engine-api/game/GameUpdates";
import { unpackMotionPlans } from "@openfront/engine-lib/game/MotionPlans";
import {
  createGameRunner,
  createGameRunnerFromSnapshot,
  GameRunner,
} from "@openfront/engine/GameRunner";
import { loadMapFiles } from "@openfront/shared/GameMapLoader";
import { describe, expect, it } from "vitest";
import {
  scriptedGameStart,
  scriptedTurn,
  TestDataMapLoader,
} from "../../util/ScriptedGame";

/**
 * What a client view builds up from a game's updates. A client of a restored
 * game sees only the updates from the restore on, so its first tick must
 * bring it to where a client that watched the whole game is.
 */
class ClientModel {
  tiles = new Map<number, number>();
  units = new Map<number, UnitUpdate>();
  plans = new Map<number, number>(); // unit (train: engine) -> planId
  railroads = new Set<number>();
  startTick: number | null = null;

  apply(gu: GameUpdateViewData): void {
    const t = gu.packedTileUpdates;
    for (let i = 0; i + 1 < t.length; i += 2) this.tiles.set(t[i], t[i + 1]);
    for (const p of gu.packedMotionPlans
      ? unpackMotionPlans(gu.packedMotionPlans)
      : []) {
      this.plans.set(p.kind === "grid" ? p.unitId : p.engineUnitId, p.planId);
    }
    for (const u of gu.updates[GameUpdateType.Unit] as UnitUpdate[]) {
      if (u.isActive) this.units.set(u.id, u);
      else this.units.delete(u.id);
    }
    const ups = gu.updates;
    for (const r of ups[
      GameUpdateType.RailroadConstructionEvent
    ] as RailroadConstructionUpdate[]) {
      this.railroads.add(r.id);
    }
    for (const r of ups[
      GameUpdateType.RailroadSnapEvent
    ] as RailroadSnapUpdate[]) {
      this.railroads.delete(r.originalId);
      this.railroads.add(r.newId1);
      this.railroads.add(r.newId2);
    }
    for (const r of ups[
      GameUpdateType.RailroadDestructionEvent
    ] as RailroadDestructionUpdate[]) {
      this.railroads.delete(r.id);
    }
    const end = ups[GameUpdateType.SpawnPhaseEnd][0] as
      | SpawnPhaseEndUpdate
      | undefined;
    if (end) this.startTick = end.startTick;
  }
}

const MAP = "world";
const TICKS = 900;

async function runner(
  model: ClientModel,
  snapshot?: Uint8Array,
): Promise<GameRunner> {
  const start = scriptedGameStart();
  const { gameMap, gameMapSize } = start.config;
  const map = await loadMapFiles(
    new TestDataMapLoader(MAP),
    gameMap,
    gameMapSize,
  );
  const onUpdate = (gu: unknown) => {
    if (typeof gu === "object" && gu !== null && "updates" in gu) {
      model.apply(gu as GameUpdateViewData);
    }
  };
  return snapshot
    ? createGameRunnerFromSnapshot(start, snapshot, undefined, map, onUpdate)
    : createGameRunner(start, undefined, map, onUpdate);
}

function step(r: GameRunner): void {
  r.addTurn(scriptedTurn(r.game));
  if (!r.executeNextTick()) throw new Error(`tick ${r.game.ticks()} failed`);
}

describe("a restored game's first tick carries the whole client state", () => {
  it(
    "matches a client that watched the game from the start",
    { timeout: 300_000 },
    async () => {
      const watched = new ClientModel();
      const original = await runner(watched);
      for (let i = 0; i < TICKS; i++) step(original);

      const restoredView = new ClientModel();
      const restored = await runner(restoredView, original.snapshot());
      step(original);
      step(restored);

      // The scripted game must reach what this test is about.
      expect(watched.startTick).not.toBeNull();
      expect(watched.plans.size).toBeGreaterThan(0);
      expect(watched.railroads.size).toBeGreaterThan(0);

      // A tile back at state 0 is the map file's: the restored view has it.
      const ownedOrEdited = [...watched.tiles].filter(
        ([tile, v]) => (v & 0xffff) !== 0 || restoredView.tiles.has(tile),
      );
      expect(new Map(ownedOrEdited)).toEqual(restoredView.tiles);

      expect([...restoredView.units.keys()].sort()).toEqual(
        [...watched.units.keys()].sort(),
      );
      for (const [id, u] of restoredView.units) {
        expect(u.ownerID, `unit ${id}`).toBe(watched.units.get(id)!.ownerID);
        expect(u.unitType, `unit ${id}`).toBe(watched.units.get(id)!.unitType);
      }

      // Plans of units still alive (a plan outlives nothing).
      const livePlans = [...watched.plans].filter(([id]) =>
        watched.units.has(id),
      );
      expect(new Map(livePlans)).toEqual(
        new Map(
          [...restoredView.plans].filter(([id]) => watched.units.has(id)),
        ),
      );
      expect(restoredView.railroads).toEqual(watched.railroads);
      expect(restoredView.startTick).toBe(watched.startTick);
    },
  );
});
