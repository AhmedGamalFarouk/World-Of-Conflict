import type { Config } from "@openfront/engine-lib/configuration/Config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MapRenderer,
  RESTORE_TIMEOUT_MS,
} from "../../src/client/render/gl/MapRenderer";
import type { RenderSettings } from "../../src/client/render/gl/RenderSettings";
import type { RendererConfig } from "../../src/client/render/types";

const stub = vi.hoisted(() => ({
  constructed: 0,
  disposeArgs: [] as Array<{ releaseContext?: boolean } | undefined>,
  failConstruct: false,
}));

vi.mock("../../src/client/render/gl/Renderer", () => ({
  GPURenderer: class {
    constructor() {
      if (stub.failConstruct) throw new Error("software context");
      stub.constructed++;
    }
    dispose(opts?: { releaseContext?: boolean }) {
      stub.disposeArgs.push(opts);
    }
    resize() {}
    setMapLayers() {}
    setLayerVisible() {}
    setLayerAlpha() {}
    setLayerDestroyedMask() {}
  },
}));

globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

function makeRenderer(): { view: MapRenderer; canvas: HTMLCanvasElement } {
  const canvas = document.createElement("canvas");
  const view = new MapRenderer(
    canvas,
    { players: [] } as unknown as RendererConfig,
    () => new Uint8Array(0),
    new Float32Array(0),
    {} as Config,
    {} as RenderSettings,
  );
  return { view, canvas };
}

describe("MapRenderer context loss", () => {
  beforeEach(() => {
    stub.constructed = 0;
    stub.disposeArgs = [];
    stub.failConstruct = false;
  });

  // A GPU-process crash is a recoverable loss, but only while the page leaves
  // recovery to the browser: disposing the context with
  // WEBGL_lose_context.loseContext() re-loses it manually, Chromium then never
  // fires webglcontextrestored, and the map stays blank for the rest of the
  // session behind a HUD that keeps updating.
  it("keeps the context when disposing because the context was lost", () => {
    const { view, canvas } = makeRenderer();
    const lost = new Event("webglcontextlost", { cancelable: true });

    canvas.dispatchEvent(lost);

    expect(lost.defaultPrevented).toBe(true);
    expect(stub.disposeArgs).toEqual([{ releaseContext: false }]);
    view.dispose();
  });

  it("releases the context on ordinary teardown", () => {
    const { view } = makeRenderer();

    view.dispose();

    // No argument — dispose() releases the context by default, so repeated
    // game starts don't overflow the browser's context limit.
    expect(stub.disposeArgs).toEqual([undefined]);
  });

  it("rebuilds the renderer and re-uploads state on restore", () => {
    const { view, canvas } = makeRenderer();
    const reupload = vi.fn();
    view.onContextRestored = reupload;

    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    canvas.dispatchEvent(new Event("webglcontextrestored"));

    expect(stub.constructed).toBe(2);
    expect(reupload).toHaveBeenCalledOnce();
    view.dispose();
  });

  it("survives a restore that cannot get an accelerated context back", () => {
    const { view, canvas } = makeRenderer();
    const reupload = vi.fn();
    view.onContextRestored = reupload;

    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    stub.failConstruct = true;

    expect(() =>
      canvas.dispatchEvent(new Event("webglcontextrestored")),
    ).not.toThrow();
    expect(reupload).not.toHaveBeenCalled();
    view.dispose();
  });
});

// The mobile shell sets onContextUnrecoverable to show "Game can't resume".
// Android drops the context on every background and restores it on resume,
// so only visible time may count, and a restore must always disarm it.
describe("MapRenderer unrecoverable context loss", () => {
  let visibility: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    stub.failConstruct = false;
    visibility = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibility,
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setVisible(v: DocumentVisibilityState) {
    visibility = v;
    document.dispatchEvent(new Event("visibilitychange"));
  }
  const lose = (c: HTMLCanvasElement) =>
    c.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  const restore = (c: HTMLCanvasElement) =>
    c.dispatchEvent(new Event("webglcontextrestored"));

  function armed() {
    const { view, canvas } = makeRenderer();
    const fatal = vi.fn();
    view.onContextUnrecoverable = fatal;
    return { view, canvas, fatal };
  }

  it("does nothing when restored in time", () => {
    const { view, canvas, fatal } = armed();
    lose(canvas);
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS - 1);
    restore(canvas);
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS * 2);
    expect(fatal).not.toHaveBeenCalled();
    view.dispose();
  });

  it("reports a context that never comes back", () => {
    const { view, canvas, fatal } = armed();
    lose(canvas);
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS);
    expect(fatal).toHaveBeenCalledExactlyOnceWith(
      `GL restore timeout ${RESTORE_TIMEOUT_MS}ms`,
    );
    view.dispose();
  });

  it("does not count time spent in the background", () => {
    const { view, canvas, fatal } = armed();
    setVisible("hidden");
    lose(canvas);
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS * 10);
    setVisible("visible");
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS - 1);
    restore(canvas);
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS * 2);
    expect(fatal).not.toHaveBeenCalled();
    view.dispose();
  });

  it("stays quiet when restored while still in the background", () => {
    const { view, canvas, fatal } = armed();
    lose(canvas);
    setVisible("hidden");
    restore(canvas);
    setVisible("visible");
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS * 2);
    expect(fatal).not.toHaveBeenCalled();
    view.dispose();
  });

  it("reports a restore that cannot rebuild the renderer", () => {
    const { view, canvas, fatal } = armed();
    lose(canvas);
    stub.failConstruct = true;
    restore(canvas);
    expect(fatal).toHaveBeenCalledExactlyOnceWith("software context");
    view.dispose();
  });

  it("stops the timer on teardown", () => {
    const { view, canvas, fatal } = armed();
    lose(canvas);
    view.dispose();
    vi.advanceTimersByTime(RESTORE_TIMEOUT_MS * 2);
    expect(fatal).not.toHaveBeenCalled();
  });

  it("never arms without a callback (the web and replays)", () => {
    const { view, canvas } = makeRenderer();
    lose(canvas);
    expect(vi.getTimerCount()).toBe(0);
    view.dispose();
  });
});
