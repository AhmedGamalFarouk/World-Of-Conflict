import { describe, expect, it } from "vitest";
import {
  isStale,
  openIdbBackend,
  SaveError,
  SaveStore,
} from "../../../src/client/mobile/SaveStore";
import { makeSave, memoryBackend } from "./saveFixtures";

describe("SaveStore", () => {
  it("reads back what was written, and null when empty", async () => {
    const mem = memoryBackend();
    const store = new SaveStore(async () => mem.backend);
    expect(await store.read()).toBeNull();
    await store.write(makeSave({ turnCount: 7 }), store.currentEpoch);
    expect((await store.read())?.turnCount).toBe(7);
  });

  it("drops a write that was queued before the save was cleared", async () => {
    const mem = memoryBackend();
    const store = new SaveStore(async () => mem.backend);
    const epoch = store.currentEpoch;
    const late = store.write(makeSave(), epoch);
    await store.clear(); // game end, abandon, discard or elimination
    // The write was queued first and ran first; what matters is that a write
    // queued after the clear, by a game that ended, is refused.
    await late;
    expect(await store.write(makeSave(), epoch)).toBe(false);
    expect(await store.read()).toBeNull();
    // A game that started after the clear writes normally.
    expect(await store.write(makeSave(), store.currentEpoch)).toBe(true);
  });

  it("runs writes and clears in order", async () => {
    const mem = memoryBackend();
    const store = new SaveStore(async () => mem.backend);
    const e = store.currentEpoch;
    void store.write(makeSave({ turnCount: 11 }), e);
    void store.write(makeSave({ turnCount: 12 }), e);
    await store.write(makeSave({ turnCount: 13 }), e);
    expect(mem.log).toEqual(["put", "put", "put"]);
    expect((await store.read())?.turnCount).toBe(13);
  });

  it("a failed write leaves the previous save in place", async () => {
    const mem = memoryBackend();
    const store = new SaveStore(async () => mem.backend);
    await store.write(makeSave({ turnCount: 11 }), store.currentEpoch);
    mem.failNext.put = new DOMException("full", "QuotaExceededError");
    await expect(
      store.write(makeSave({ turnCount: 12 }), store.currentEpoch),
    ).rejects.toThrow();
    expect((await store.read())?.turnCount).toBe(11);
  });

  it("reports unavailable storage and damaged saves distinctly", async () => {
    const none = new SaveStore(async () => null);
    await expect(none.read()).rejects.toMatchObject({ kind: "unavailable" });
    const broken = new SaveStore(
      async () => memoryBackend({ version: 99 }).backend,
    );
    await expect(broken.read()).rejects.toBeInstanceOf(SaveError);
    await expect(broken.read()).rejects.toMatchObject({ kind: "damaged" });
  });

  it("opens no backend without IndexedDB", async () => {
    expect(await openIdbBackend(undefined)).toBeNull();
  });
});

describe("isStale", () => {
  it("a save from another release build is stale; dev builds never are", () => {
    expect(isStale({ commit: "v0.2.0" }, "v0.2.1")).toBe(true);
    expect(isStale({ commit: "v0.2.0" }, "v0.2.0")).toBe(false);
    expect(isStale({ commit: "v0.2.0" }, "DEV")).toBe(false);
    expect(isStale({ commit: "DEV" }, "v0.2.0")).toBe(false);
  });
});
