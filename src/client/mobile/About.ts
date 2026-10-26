// About: the legal page every shared APK must carry (AGPL-3.0 source offer,
// OpenFront's CC BY-SA credit, dependency notices) plus the build version and
// the local play counter testers report. Opened from the title screen and
// from settings; Android back closes it (MobileBack.ts).
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../Utils";
import {
  analyticsAvailable,
  analyticsConsent,
  setAnalyticsConsent,
} from "./Analytics";
import {
  AGPL_URL,
  appVersion,
  CC_BY_SA_URL,
  isDevBuild,
  OPENFRONT_SOURCE_URL,
  PRIVACY_URL,
  sourceLink,
} from "./AppInfo";
import { appendError, errorLogReport } from "./ErrorLog";
import { medianGame, readPlayStats } from "./PlayStats";
import {
  confirmDiscard,
  confirmGone,
  discardSavedGame,
  homeSave,
  onHomeSaveChange,
} from "./SaveHome";

type Licenses =
  | { state: "loading" }
  | { state: "ok"; text: string }
  | { state: "failed"; reason: string };

@customElement("wc-about")
export class WcAbout extends LitElement {
  @state() private open = false;
  @state() private licenses: Licenses | null = null;
  /** "Copied (N entries)", for 2 s. */
  @state() private toast: string | null = null;
  /** Selectable log text, when the clipboard refused. */
  @state() private manualLog: string | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeSave: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeSave = onHomeSaveChange(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.unsubscribeSave?.();
    super.disconnectedCallback();
  }

  private async clearSave() {
    if (await confirmDiscard()) await discardSavedGame();
  }
  private opener: HTMLElement | null = null;

  createRenderRoot() {
    return this;
  }

  show(): void {
    this.opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.licenses = null;
    this.manualLog = null;
    this.open = true;
    void this.updateComplete.then(() =>
      this.querySelector<HTMLElement>(".wc-about-back")?.focus(),
    );
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Back: the licenses pane first, then About itself. */
  back(): void {
    if (this.manualLog !== null) {
      this.manualLog = null;
      return;
    }
    if (this.licenses !== null) {
      this.licenses = null;
      return;
    }
    this.open = false;
    this.opener?.focus();
    this.opener = null;
  }

  private async copyLog() {
    const { text, count } = errorLogReport();
    try {
      await navigator.clipboard.writeText(text);
      this.toast = translateText("mobile.about_log_copied", { count });
      if (this.toastTimer !== null) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => (this.toast = null), 2000);
    } catch {
      appendError({ code: "errlog.clipboard_failed" });
      this.manualLog = text;
    }
  }

  private async showLicenses() {
    this.licenses = { state: "loading" };
    try {
      const res = await fetch("licenses.md");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.licenses = { state: "ok", text: await res.text() };
    } catch (e) {
      this.licenses = {
        state: "failed",
        reason: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private link(href: string, label: string) {
    return html`<a
      class="wc-about-link"
      href=${href}
      target="_blank"
      rel="noopener"
      >${label} ↗</a
    >`;
  }

  private renderManualLog(text: string) {
    return html`<p>${translateText("mobile.about_log_manual")}</p>
      <pre class="wc-about-pre">${text}</pre>`;
  }

  private renderLicenses(l: Licenses) {
    if (l.state === "loading") {
      return html`<p class="wc-about-muted">
        ${translateText("mobile.loading")}
      </p>`;
    }
    if (l.state === "failed") {
      return html`<p>${translateText("mobile.licenses_failed")}</p>
        <p class="wc-about-muted">${l.reason}</p>`;
    }
    return html`<pre class="wc-about-pre">${l.text}</pre>
      <p class="wc-about-muted">
        ${translateText("mobile.about_native_licenses")}
      </p>`;
  }

  private renderMain() {
    const version = appVersion();
    const stats = readPlayStats();
    const median = stats ? medianGame(stats) : null;
    return html`
      <p class="wc-about-mark">
        <span>World</span> <span class="wc-wordmark-of">of</span>
        <span>Conflict</span>
      </p>
      <p class="wc-about-version">
        <span class="wc-num"
          >${translateText("mobile.about_version", { version })}</span
        >
        ${isDevBuild(version)
          ? html`<span class="wc-about-dev"
                >${translateText("mobile.about_dev_build")}</span
              >
              <span class="wc-about-muted"
                >${translateText("mobile.about_dev_build_note")}</span
              >`
          : nothing}
      </p>

      <p class="wc-label">${translateText("mobile.about_licenses_group")}</p>
      <p>${translateText("mobile.about_license")}</p>
      <a
        class="wc-btn wc-btn-gold"
        href=${sourceLink(version)}
        target="_blank"
        rel="noopener"
        >${translateText("mobile.about_source")} ↗</a
      >
      <div class="wc-about-links">
        ${this.link(AGPL_URL, translateText("mobile.about_license_text"))}
        <button class="wc-about-link" @click=${() => this.showLicenses()}>
          ${translateText("mobile.about_licenses")}
        </button>
      </div>

      <p class="wc-label">${translateText("mobile.about_credits")}</p>
      <p>${translateText("mobile.about_assets")}</p>
      <div class="wc-about-links">
        ${this.link(
          OPENFRONT_SOURCE_URL,
          translateText("mobile.about_openfront_source"),
        )}
        ${this.link(CC_BY_SA_URL, "CC BY-SA 4.0")}
      </div>

      ${stats && stats.started > 0
        ? html`<p class="wc-about-muted">
            ${translateText("mobile.about_games", {
              started: stats.started,
              finished: stats.finished,
            })}
          </p>`
        : nothing}
      ${median
        ? html`<p class="wc-about-muted">
            ${translateText(
              median.provisional
                ? "mobile.about_median_provisional"
                : "mobile.about_median",
              { minutes: median.minutes },
            )}
          </p>`
        : nothing}

      <p class="wc-label">${translateText("mobile.about_support")}</p>
      <div class="wc-about-links">
        <button class="wc-about-link" @click=${() => this.copyLog()}>
          ${translateText("mobile.about_copy_log")}
        </button>
        ${homeSave().kind === "save"
          ? html`<button class="wc-about-link" @click=${() => this.clearSave()}>
              ${translateText("save.clear_saved")}
            </button>`
          : nothing}
        ${this.link(PRIVACY_URL, translateText("mobile.about_privacy"))}
        ${analyticsAvailable()
          ? html`<button
              class="wc-about-link"
              aria-pressed=${analyticsConsent() === "on"}
              @click=${() => {
                setAnalyticsConsent(analyticsConsent() !== "on");
                this.requestUpdate();
              }}
            >
              ${translateText(
                analyticsConsent() === "on"
                  ? "mobile.about_analytics_on"
                  : "mobile.about_analytics_off",
              )}
            </button>`
          : nothing}
      </div>
      <p class="wc-about-muted" role="status" aria-live="polite">
        ${this.toast ?? nothing}
      </p>
    `;
  }

  render() {
    if (!this.open) return nothing;
    const title =
      this.manualLog !== null
        ? translateText("mobile.about_copy_log")
        : this.licenses !== null
          ? translateText("mobile.about_licenses")
          : translateText("mobile.about");
    return html`
      <div
        class="wc-scrim wc-about"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wc-about-title"
      >
        <div class="wc-plate wc-about-card">
          <div class="wc-about-head">
            <button
              class="wc-btn wc-btn-steel wc-about-back"
              aria-label=${translateText("mobile.back")}
              @click=${() => this.back()}
            >
              ‹
            </button>
            <h2 id="wc-about-title" class="wc-about-title">${title}</h2>
          </div>
          <div class="wc-about-body">
            ${this.manualLog !== null
              ? this.renderManualLog(this.manualLog)
              : this.licenses !== null
                ? this.renderLicenses(this.licenses)
                : this.renderMain()}
          </div>
        </div>
      </div>
    `;
  }
}

function aboutElement(): WcAbout {
  let el = document.querySelector<WcAbout>("wc-about");
  if (!el) {
    el = document.createElement("wc-about") as WcAbout;
    document.body.append(el);
  }
  return el;
}

export function openAbout(): void {
  aboutElement().show();
}

/**
 * First launch of a build with analytics: asks once. NO THANKS is the gold
 * face and what Android back does, so backing out never opts in.
 */
export async function askAnalyticsConsent(): Promise<void> {
  if (!analyticsAvailable() || analyticsConsent() !== null) return;
  setAnalyticsConsent(
    await confirmGone({
      title: translateText("mobile.analytics_title"),
      body: translateText("mobile.analytics_body"),
      keep: translateText("mobile.analytics_no"),
      destroy: translateText("mobile.analytics_yes"),
    }),
  );
}

/** Android back: true when About (or its licenses pane) took it. */
export function aboutBack(): boolean {
  const el = document.querySelector<WcAbout>("wc-about");
  if (!el?.isOpen) return false;
  el.back();
  return true;
}
