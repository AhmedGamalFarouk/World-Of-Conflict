// About: the legal page every shared APK must carry (AGPL-3.0 source offer,
// OpenFront's CC BY-SA credit, dependency notices) plus the build version and
// the local play counter testers report. Opened from the title screen and
// from settings; Android back closes it (MobileBack.ts).
import { html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../Utils";
import {
  AGPL_URL,
  appVersion,
  CC_BY_SA_URL,
  isDevBuild,
  OPENFRONT_SOURCE_URL,
  SOURCE_URL,
} from "./AppInfo";
import { readPlayStats } from "./PlayStats";

type Licenses =
  | { state: "loading" }
  | { state: "ok"; text: string }
  | { state: "failed"; reason: string };

@customElement("wc-about")
export class WcAbout extends LitElement {
  @state() private open = false;
  @state() private licenses: Licenses | null = null;
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
    if (this.licenses !== null) {
      this.licenses = null;
      return;
    }
    this.open = false;
    this.opener?.focus();
    this.opener = null;
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
        href=${SOURCE_URL}
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
    `;
  }

  render() {
    if (!this.open) return nothing;
    const title =
      this.licenses !== null
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
            ${this.licenses !== null
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

/** Android back: true when About (or its licenses pane) took it. */
export function aboutBack(): boolean {
  const el = document.querySelector<WcAbout>("wc-about");
  if (!el?.isOpen) return false;
  el.back();
  return true;
}
