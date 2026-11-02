import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ is: false, vibrate: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.is },
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: { vibrate: native.vibrate },
}));

import { vibrate, vibrateAlert } from "../../../src/client/mobile/Haptics";
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

  it("sends an alert through the native plugin in the app, past touch feedback", () => {
    native.is = true;
    native.vibrate.mockReset().mockResolvedValue(undefined);
    try {
      vibrateAlert(40);
      expect(native.vibrate).toHaveBeenCalledWith({ duration: 40 });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      native.is = false;
    }
  });

  it("falls back to the WebView for an alert in the browser, and honours the setting", () => {
    vibrateAlert(15);
    expect(spy).toHaveBeenCalledWith(15);
    new UserSettings().toggleVibration();
    vibrateAlert(40);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
