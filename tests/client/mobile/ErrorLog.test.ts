import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendError,
  errorLogReport,
  fitEntry,
  flushErrorLog,
  installErrorLog,
  readErrorLog,
  resetErrorLogForTests,
} from "../../../src/client/mobile/ErrorLog";

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  resetErrorLogForTests();
});
afterEach(() => vi.useRealTimers());

describe("ErrorLog", () => {
  it("keeps the last 200 entries", () => {
    for (let i = 0; i < 205; i++) appendError({ code: "js.error", turn: i });
    const log = readErrorLog();
    expect(log).toHaveLength(200);
    expect(log[0].turn).toBe(5);
  });

  it("cuts an entry to 2 KB, dropping the stack before the message", () => {
    const e = fitEntry({
      code: "js.error",
      time: 0,
      message: "m".repeat(5000),
      stack: "s".repeat(5000),
      operation: "o".repeat(1000),
    });
    expect(JSON.stringify(e).length).toBeLessThanOrEqual(2048);
    expect(e.message).toBeDefined();
  });

  it("persists at most once a second, the memory buffer is always current", () => {
    const set = vi.spyOn(Storage.prototype, "setItem");
    appendError({ code: "a" });
    appendError({ code: "b" });
    appendError({ code: "c" });
    expect(set).toHaveBeenCalledTimes(1);
    expect(readErrorLog()).toHaveLength(3);
    vi.advanceTimersByTime(1000);
    expect(set).toHaveBeenCalledTimes(2);
    expect(JSON.parse(localStorage.getItem("wc-errlog")!)).toHaveLength(3);
    set.mockRestore();
  });

  it("flush writes at once and a new session reads it back", () => {
    appendError({ code: "a" });
    appendError({ code: "b" });
    flushErrorLog();
    resetErrorLogForTests();
    expect(readErrorLog().map((e) => e.code)).toEqual(["a", "b"]);
  });

  it("captures window errors and unhandled rejections", () => {
    installErrorLog();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    const rejection = new Event("unhandledrejection") as Event & {
      reason: unknown;
    };
    rejection.reason = new Error("nope");
    window.dispatchEvent(rejection);
    expect(readErrorLog().map((e) => e.code)).toEqual([
      "js.error",
      "js.unhandled_rejection",
    ]);
  });

  it("reports a header and 'No errors logged' when empty, no ids ever", () => {
    const empty = errorLogReport();
    expect(empty.count).toBe(0);
    expect(empty.text).toContain("World Of Conflict");
    expect(empty.text).toContain("No errors logged");
    appendError({ code: "save.stale", message: "x" });
    const one = errorLogReport();
    expect(one.count).toBe(1);
    expect(one.text).toContain('"code":"save.stale"');
    expect(one.text).not.toMatch(/clientID|persistentID/);
  });

  it("survives blocked storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => appendError({ code: "a" })).not.toThrow();
    expect(readErrorLog()).toHaveLength(1);
    vi.restoreAllMocks();
  });
});

describe("ErrorLog flush", () => {
  it("writes the last entries when the app goes to the background", () => {
    installErrorLog();
    appendError({ code: "js.error" }); // persists at once (first write)
    appendError({ code: "js.error", turn: 2 }); // waits for the timer
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(JSON.parse(localStorage.getItem("wc-errlog")!)).toHaveLength(2);
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });
});
