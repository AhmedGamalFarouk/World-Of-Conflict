// The mobile app's end-of-game failure screen: a heading, what happened, a
// code and the version a tester can screenshot, and one way out. Replaces
// upstream's error dump (showErrorModal) for the two errors that end a game.
import { homeHref, translateText } from "../Utils";
import { appVersion } from "./AppInfo";

export interface Fatal {
  headingKey: string;
  bodyKey: string;
  code: string;
}

const MAP_LOAD: Fatal = {
  headingKey: "mobile.map_load_failed",
  bodyKey: "mobile.map_load_failed_body",
  code: "WC-E01",
};
const CRASHED: Fatal = {
  headingKey: "mobile.game_cant_resume",
  bodyKey: "mobile.game_cant_resume_body",
  code: "WC-E02",
};
export const GL_LOST: Fatal = {
  headingKey: "mobile.game_cant_resume",
  bodyKey: "mobile.game_cant_resume_body",
  code: "WC-E03",
};
const CANT_START: Fatal = {
  headingKey: "mobile.game_cant_start",
  bodyKey: "mobile.game_cant_start_body",
  code: "WC-E04",
};

/**
 * Which upstream showErrorModal calls end the game on the phone. Offline the
 * only caller using connection_error is the createClientGame rejection
 * (server "error" messages never arrive without a server); the map loaders
 * say "Failed to load"/"Unknown map". Every other heading (spawn_failed,
 * desync, ...) keeps upstream's modal.
 */
export function fatalForHeading(heading: string, error: string): Fatal | null {
  if (heading === "error_modal.connection_error") {
    return /Failed to load|Unknown map/.test(error) ? MAP_LOAD : CANT_START;
  }
  if (heading === "error_modal.crashed") return CRASHED;
  return null;
}

const DETAIL_MAX = 120;
const STACK_MAX = 2000;

export function isFatalShown(): boolean {
  return document.getElementById("wc-fatal") !== null;
}

export function backToMenu(): void {
  window.location.href = homeHref();
}

/** Shows the fatal screen; the first call wins, later ones are ignored. */
export function showFatal(fatal: Fatal, detail = "", stack = ""): void {
  if (isFatalShown()) return;
  const version = appVersion();
  const shortDetail =
    detail.length > DETAIL_MAX ? detail.slice(0, DETAIL_MAX - 1) + "…" : detail;

  const el = (tag: string, cls: string, text = "") => {
    const node = document.createElement(tag);
    node.className = cls;
    node.textContent = text;
    return node;
  };

  const root = el("div", "wc-fatal");
  root.id = "wc-fatal";
  root.setAttribute("role", "alertdialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "wc-fatal-title");

  const card = el("div", "wc-plate wc-fatal-card");
  const title = el("h2", "wc-fatal-title", translateText(fatal.headingKey));
  title.id = "wc-fatal-title";
  card.append(
    title,
    el("p", "wc-fatal-body", translateText(fatal.bodyKey)),
    el(
      "p",
      "wc-fatal-detail",
      [fatal.code, shortDetail, version].filter(Boolean).join(" · "),
    ),
    el("p", "wc-fatal-report", translateText("mobile.fatal_report")),
  );

  const copy = el(
    "button",
    "wc-fatal-copy",
    translateText("mobile.fatal_copy"),
  );
  copy.addEventListener("click", async () => {
    const details = JSON.stringify({
      code: fatal.code,
      version,
      message: detail,
      stack: stack.slice(0, STACK_MAX),
      time: new Date().toISOString(),
    });
    try {
      await navigator.clipboard.writeText(details);
      copy.textContent = translateText("common.copied");
    } catch {
      copy.textContent = translateText("common.failed_copy");
    }
  });

  const back = el(
    "button",
    "wc-btn wc-btn-gold wc-fatal-back",
    translateText("mobile.back_to_menu"),
  );
  back.addEventListener("click", backToMenu);

  card.append(copy, back);
  root.append(card);
  document.body.append(root);
  back.focus();
}
