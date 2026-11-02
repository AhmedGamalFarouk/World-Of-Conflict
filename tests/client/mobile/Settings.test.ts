import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../../resources/lang/en.json";
import {
  BUILTIN_PRESETS,
  stableStringify,
} from "../../../src/client/GraphicsPresets";
import "../../../src/client/mobile/Settings";
import type { WcSettings } from "../../../src/client/mobile/Settings";
import "../../../src/client/UserSettingModal";
import { UserSettings } from "../../../src/client/UserSettings";

type Updatable = { updateComplete: Promise<unknown> };

async function mount(): Promise<WcSettings & Updatable> {
  const el = document.createElement("wc-settings") as WcSettings & Updatable;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

async function open(el: WcSettings & Updatable, section: string) {
  el.querySelector<HTMLElement>(`[data-section=${section}]`)!.click();
  await el.updateComplete;
}

const radio = (el: Element, row: string, text: string) =>
  [...el.querySelectorAll<HTMLElement>(`#${row} [role=radio]`)].find(
    (b) => b.textContent!.trim() === text,
  )!;

describe("phone settings", () => {
  beforeEach(() => {
    vi.stubEnv("MODE", "mobile");
    document.body.innerHTML = "";
    localStorage.clear();
    (UserSettings as unknown as { cache: Map<string, unknown> }).cache.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("replaces upstream's tabs inside the settings modal", async () => {
    const modal = document.createElement("user-setting") as HTMLElement &
      Updatable;
    document.body.appendChild(modal);
    await modal.updateComplete;
    expect(modal.querySelector("wc-settings")).not.toBeNull();
    for (const web of ["#left-click-toggle", "#lobby-start-alerts-toggle"]) {
      expect(modal.querySelector(web)).toBeNull();
    }
  });

  it("shows the rail stop a game starts on and stores a picked one", async () => {
    const el = await mount();
    // The 20% default starts the rail on 25%.
    expect(radio(el, "wc-set-send", "25%").getAttribute("aria-checked")).toBe(
      "true",
    );
    radio(el, "wc-set-send", "75%").click();
    await el.updateComplete;
    expect(new UserSettings().attackRatio()).toBe(0.75);
    expect(radio(el, "wc-set-send", "75%").getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("flips a switch row and its stored value", async () => {
    const el = await mount();
    await open(el, "sound");
    const row = el.querySelector<HTMLElement>("#wc-set-vibration")!;
    expect(row.getAttribute("aria-checked")).toBe("true");
    row.click();
    await el.updateComplete;
    expect(new UserSettings().vibration()).toBe(false);
    expect(row.getAttribute("aria-checked")).toBe("false");
  });

  it("writes a volume from its slider", async () => {
    const el = await mount();
    await open(el, "sound");
    const music = el.querySelector<HTMLInputElement>("#wc-set-music")!;
    music.value = "30";
    music.dispatchEvent(new Event("input"));
    expect(new UserSettings().audioVolume("music")).toBe(0.3);
  });

  it("applies a map style preset", async () => {
    const el = await mount();
    await open(el, "display");
    radio(el, "wc-set-style", "mobile.settings_style_night").click();
    await el.updateComplete;
    const night = BUILTIN_PRESETS.find(
      (p) => p.nameKey === "graphics_setting.preset_night",
    )!;
    expect(stableStringify(new UserSettings().graphicsOverrides())).toBe(
      stableStringify(night.overrides),
    );
    expect(
      radio(el, "wc-set-style", "mobile.settings_style_night").getAttribute(
        "aria-checked",
      ),
    ).toBe("true");
  });

  it("has an en.json string for every key it renders", async () => {
    const el = await mount();
    const strings = en.mobile as Record<string, string>;
    for (const section of ["battle", "sound", "display", "app"]) {
      await open(el, section);
      const raw = el.textContent!.match(/mobile\.[a-z_]+/g) ?? [];
      for (const key of raw) {
        expect(strings[key.slice("mobile.".length)], key).toBeTruthy();
      }
    }
  });
});
