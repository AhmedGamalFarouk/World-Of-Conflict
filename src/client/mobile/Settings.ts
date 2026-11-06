// Phone settings: the body of <user-setting> on the mobile shell (both the
// title-screen page and the in-game instance). Upstream's tabs hold web and
// desktop settings (keybinds, cursor, lobbies, Steam, window focus); this
// keeps what a solo phone game reads and adds the app's own rows.
import { html, LitElement, nothing, type TemplateResult } from "lit";
import { customElement, state } from "lit/decorators.js";
import metadata from "../../../resources/lang/metadata.json";
import "../components/GraphicsAdvancedSettings";
import {
  BUILTIN_PRESETS,
  migrateLegacyGraphicsSettings,
  stableStringify,
} from "../GraphicsPresets";
import type { LangSelector } from "../LangSelector";
import { playCue } from "../sound/CuePlayer";
import {
  type AudioCategory,
  GRAPHICS_KEY,
  USER_SETTINGS_CHANGED_EVENT,
  UserSettings,
} from "../UserSettings";
import { textDirection, translateText } from "../Utils";
import { openAbout } from "./About";
import {
  analyticsAvailable,
  analyticsConsent,
  setAnalyticsConsent,
} from "./Analytics";
import { appVersion } from "./AppInfo";

export type SettingsSection = "battle" | "sound" | "display" | "app";
const SECTIONS: readonly SettingsSection[] = [
  "battle",
  "sound",
  "display",
  "app",
];

/** The send rail's stops; ControlPanel snaps the stored ratio to one. */
const SEND_STOPS = [25, 50, 75, 100] as const;
/** Ticks (10 a second) a nuke on a new ally stays blocked; 5 is the default. */
const NUKE_LOCK_TICKS = [0, 5, 10, 30] as const;
const CHANNELS: readonly AudioCategory[] = [
  "master",
  "music",
  "effects",
  "alerts",
  "ambience",
  "interface",
];
/** Map styles offered on the phone, by upstream preset key. */
const STYLES: readonly { key: string; label: string }[] = [
  {
    key: "graphics_setting.preset_default",
    label: "mobile.settings_style_standard",
  },
  {
    key: "graphics_setting.preset_night",
    label: "mobile.settings_style_night",
  },
  {
    key: "graphics_setting.preset_colorblind",
    label: "mobile.settings_style_colorblind",
  },
];

const t = (key: string, params?: Record<string, string | number>) =>
  translateText(`mobile.settings_${key}`, params);

@customElement("wc-settings")
export class WcSettings extends LitElement {
  @state() section: SettingsSection = "battle";
  @state() private advanced = false;
  private readonly settings = new UserSettings();
  private lastTickMs = 0;

  createRenderRoot() {
    return this;
  }

  // The advanced fold and the in-game menu also write graphics.
  private readonly refresh = () => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener(
      `${USER_SETTINGS_CHANGED_EVENT}:${GRAPHICS_KEY}`,
      this.refresh,
    );
  }

  disconnectedCallback() {
    globalThis.removeEventListener(
      `${USER_SETTINGS_CHANGED_EVENT}:${GRAPHICS_KEY}`,
      this.refresh,
    );
    super.disconnectedCallback();
  }

  protected willUpdate() {
    this.dir = textDirection();
  }

  private toggle(
    id: string,
    key: string,
    on: boolean,
    flip: () => void,
  ): TemplateResult {
    return html`<button
      id=${id}
      class="wc-plate wc-set-row"
      role="switch"
      aria-checked=${on ? "true" : "false"}
      @click=${() => {
        flip();
        this.requestUpdate();
      }}
    >
      <span class="wc-set-text">
        <span class="wc-set-title">${t(key)}</span>
        <span class="wc-set-desc">${t(`${key}_desc`)}</span>
      </span>
      <span class="wc-switch" aria-hidden="true"></span>
    </button>`;
  }

  private choice<T>(
    id: string,
    key: string,
    options: readonly { value: T; text: string }[],
    current: T | undefined,
    pick: (value: T) => void,
  ): TemplateResult {
    return html`<div id=${id} class="wc-plate wc-set-row">
      <span class="wc-set-text">
        <span class="wc-set-title">${t(key)}</span>
        <span class="wc-set-desc">${t(`${key}_desc`)}</span>
      </span>
      <span class="wc-seg" role="radiogroup" aria-label=${t(key)}>
        ${options.map(
          (o) =>
            html`<button
              class="wc-btn wc-btn-steel"
              role="radio"
              aria-checked=${o.value === current ? "true" : "false"}
              @click=${() => {
                pick(o.value);
                this.requestUpdate();
              }}
            >
              ${o.text}
            </button>`,
        )}
      </span>
    </div>`;
  }

  private renderBattle() {
    // The rail starts on the nearest stop (ControlPanel), higher on a tie.
    const stored = this.settings.attackRatio() * 100;
    const send = SEND_STOPS.reduce((best, stop) =>
      Math.abs(stop - stored) <= Math.abs(best - stored) ? stop : best,
    );
    return html`
      ${this.choice(
        "wc-set-send",
        "send",
        SEND_STOPS.map((v) => ({ value: v, text: `${v}%` })),
        send,
        (v) => this.settings.setAttackRatio(v / 100),
      )}
      ${this.choice(
        "wc-set-nuke-lock",
        "nuke_lock",
        NUKE_LOCK_TICKS.map((v) => ({
          value: v,
          text: v === 0 ? t("off") : t("seconds", { seconds: v / 10 }),
        })),
        this.settings.nukeAllianceSafetyDuration(),
        (v) => this.settings.setNukeAllianceSafetyDuration(v),
      )}
      ${this.toggle("wc-set-camera", "camera", this.settings.goToPlayer(), () =>
        this.settings.toggleGoToPlayer(),
      )}
      ${this.toggle("wc-set-hints", "hints", this.settings.helpMessages(), () =>
        this.settings.toggleHelpMessages(),
      )}
      ${this.toggle(
        "wc-set-fronts",
        "fronts",
        this.settings.attackingTroopsOverlay(),
        () => this.settings.toggleAttackingTroopsOverlay(),
      )}
      ${this.toggle("wc-set-emojis", "emojis", this.settings.emojis(), () =>
        this.settings.toggleEmojis(),
      )}
    `;
  }

  private setVolume(category: AudioCategory, e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    // AudioMixer follows the settings event, menu music and a game alike.
    this.settings.setAudioVolume(category, value / 100);
    // A drag fires input continuously: tick like a ratchet, not a buzz.
    const now = Date.now();
    if (now - this.lastTickMs >= 150) {
      this.lastTickMs = now;
      playCue("slider");
    }
    this.requestUpdate();
  }

  private renderSound() {
    return html`
      ${this.toggle(
        "wc-set-vibration",
        "vibration",
        this.settings.vibration(),
        () => this.settings.toggleVibration(),
      )}
      ${this.toggle(
        "wc-set-build-sounds",
        "build_sounds",
        this.settings.buildSounds(),
        () => this.settings.toggleBuildSounds(),
      )}
      <div class="wc-plate wc-set-volumes">
        ${CHANNELS.map((category) => {
          const value = Math.round(this.settings.audioVolume(category) * 100);
          return html`<label class="wc-set-volume">
            <span class="wc-set-title">${t(category)}</span>
            <input
              id="wc-set-${category}"
              class="wc-range"
              type="range"
              min="0"
              max="100"
              .value=${String(value)}
              style="--p: ${value}%"
              @input=${(e: Event) => this.setVolume(category, e)}
            />
            <span class="wc-num wc-set-value">${value}</span>
          </label>`;
        })}
      </div>
      <button
        id="wc-set-reset-sound"
        class="wc-btn wc-btn-steel wc-set-end"
        @click=${() => {
          this.settings.resetAudio();
          this.requestUpdate();
        }}
      >
        ${t("reset_sound")}
      </button>
    `;
  }

  private renderDisplay() {
    const current = stableStringify(this.settings.graphicsOverrides());
    const active = BUILTIN_PRESETS.find(
      (p) => stableStringify(p.overrides) === current,
    )?.nameKey;
    return html`
      ${this.choice(
        "wc-set-style",
        "style",
        STYLES.map((s) => ({ value: s.key, text: translateText(s.label) })),
        active,
        (key) => {
          const preset = BUILTIN_PRESETS.find((p) => p.nameKey === key);
          if (preset === undefined) return;
          // Keeps a pre-preset custom look as a saved preset before replacing it.
          migrateLegacyGraphicsSettings(this.settings);
          this.settings.setGraphicsOverrides(preset.overrides);
        },
      )}
      ${this.toggle(
        "wc-set-alert-frame",
        "alert_frame",
        this.settings.alertFrame(),
        () => this.settings.toggleAlertFrame(),
      )}
      ${this.toggle("wc-set-advanced", "advanced", this.advanced, () => {
        this.advanced = !this.advanced;
      })}
      ${this.advanced
        ? html`<graphics-advanced-settings></graphics-advanced-settings>`
        : nothing}
    `;
  }

  private renderLanguage() {
    // The page's language picker; in a game its page is not reachable.
    const selector = document.querySelector<LangSelector>("lang-selector");
    if (selector === null || document.body.classList.contains("in-game")) {
      return nothing;
    }
    const code = selector.currentLang;
    const name = metadata.find((l) => l.code === code)?.native ?? code;
    return html`<button
      id="wc-set-language"
      class="wc-plate wc-set-row"
      @click=${() => void selector.openModal()}
    >
      <span class="wc-set-text">
        <span class="wc-set-title">${t("language")}</span>
        <span class="wc-set-desc">${name}</span>
      </span>
      <span class="wc-set-chevron" aria-hidden="true">›</span>
    </button>`;
  }

  private renderApp() {
    return html`
      ${this.renderLanguage()}
      ${analyticsAvailable()
        ? this.toggle(
            "wc-set-analytics",
            "analytics",
            analyticsConsent() === "on",
            () => setAnalyticsConsent(analyticsConsent() !== "on"),
          )
        : nothing}
      ${this.toggle(
        "wc-set-performance",
        "performance",
        this.settings.performanceOverlay(),
        () => this.settings.togglePerformanceOverlay(),
      )}
      <button
        id="wc-set-about"
        class="wc-plate wc-set-row"
        @click=${() => openAbout()}
      >
        <span class="wc-set-text">
          <span class="wc-set-title">${translateText("mobile.about")}</span>
          <span class="wc-set-desc"
            >${t("about_desc", { version: appVersion() })}</span
          >
        </span>
        <span class="wc-set-chevron" aria-hidden="true">›</span>
      </button>
    `;
  }

  private renderSection() {
    switch (this.section) {
      case "sound":
        return this.renderSound();
      case "display":
        return this.renderDisplay();
      case "app":
        return this.renderApp();
      default:
        return this.renderBattle();
    }
  }

  render() {
    return html`
      <nav class="wc-set-nav" role="tablist" aria-orientation="vertical">
        ${SECTIONS.map(
          (s) =>
            html`<button
              class="wc-btn wc-btn-steel"
              role="tab"
              data-section=${s}
              aria-selected=${s === this.section ? "true" : "false"}
              @click=${() => (this.section = s)}
            >
              ${t(s)}
            </button>`,
        )}
      </nav>
      <div class="wc-set-list" role="tabpanel" aria-label=${t(this.section)}>
        ${this.renderSection()}
      </div>
    `;
  }
}
