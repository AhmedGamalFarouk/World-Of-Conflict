import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vibrate } from "../../../src/client/mobile/Haptics";
import { UserSettings } from "../../../src/client/UserSettings";

describe("vibrate", () => {
  const spy = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    spy.mockClear();
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: spy,
    });
  });
  afterEach(() => localStorage.clear());

  it("vibrates by default", () => {
    vibrate(15);
    expect(spy).toHaveBeenCalledWith(15);
  });

  it("makes no call once the player turns Vibration off", () => {
    const settings = new UserSettings();
    expect(settings.vibration()).toBe(true);
    settings.toggleVibration();
    expect(settings.vibration()).toBe(false);
    vibrate(40);
    expect(spy).not.toHaveBeenCalled();
    settings.toggleVibration();
    vibrate(8);
    expect(spy).toHaveBeenCalledWith(8);
  });
});
