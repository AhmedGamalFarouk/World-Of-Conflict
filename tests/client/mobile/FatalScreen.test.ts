import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readErrorLog,
  resetErrorLogForTests,
} from "../../../src/client/mobile/ErrorLog";
import {
  fatalForHeading,
  showFatal,
} from "../../../src/client/mobile/FatalScreen";
import { saveStore } from "../../../src/client/mobile/SaveStore";

beforeEach(() => {
  localStorage.clear();
  resetErrorLogForTests();
});
afterEach(() => document.getElementById("wc-fatal")?.remove());

describe("spawn_failed panel", () => {
  it("is one title and one gold way home, without the code or copy button", () => {
    showFatal(fatalForHeading("error_modal.spawn_failed.title", "x")!);
    const root = document.getElementById("wc-fatal")!;
    expect(root.querySelector(".wc-fatal-title")).not.toBeNull();
    expect(root.querySelector(".wc-fatal-detail")).toBeNull();
    expect(root.querySelector(".wc-fatal-copy")).toBeNull();
    const buttons = root.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].className).toContain("wc-btn-gold");
  });
});

describe("fatal screens write the error log", () => {
  it("records fatal.<kind> with the detail", () => {
    showFatal(fatalForHeading("error_modal.crashed", "boom")!, "boom", "stack");
    expect(readErrorLog()).toMatchObject([
      { code: "fatal.crashed", operation: "WC-E02", message: "boom" },
    ]);
  });
});

describe("fatals and the saved game", () => {
  it("a crash or failed spawn clears it (a resume would fail again); a map-load failure keeps it", () => {
    const clear = vi.spyOn(saveStore, "clear").mockResolvedValue();
    showFatal(
      fatalForHeading("error_modal.connection_error", "Failed to load")!,
    );
    document.getElementById("wc-fatal")?.remove();
    showFatal(fatalForHeading("error_modal.crashed", "")!);
    document.getElementById("wc-fatal")?.remove();
    showFatal(fatalForHeading("error_modal.spawn_failed.title", "")!);
    expect(clear).toHaveBeenCalledTimes(2);
    clear.mockRestore();
  });
});
