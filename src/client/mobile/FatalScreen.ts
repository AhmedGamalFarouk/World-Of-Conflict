// The mobile app's end-of-game failure screen: a heading, what happened, a
// code and the version a tester can screenshot, and one way out. Replaces
// upstream's error dump (showErrorModal) for the two errors that end a game.
import { homeHref, translateText } from "../Utils";
import { appVersion } from "./AppInfo";
import { appendError, flushErrorLog } from "./ErrorLog";
import { saveStore } from "./SaveStore";

export interface Fatal {
  /** ErrorLog code is `fatal.<kind>`. */
  kind: string;
  headingKey: string;
  bodyKey: string;
  code: string;
  /** Just the heading, what happened and one way out (no code, no copy). */
  plain?: boolean;
  /** The same failure would come back on resume: the saved game goes too. */
  clearsSave?: boolean;
}

const MAP_LOAD: Fatal = {
  kind: "map_load",
  headingKey: "mobile.map_load_failed",
  bodyKey: "mobile.map_load_failed_body",
  code: "WC-E01",
};
const CRASHED: Fatal = {
  kind: "crashed",
  headingKey: "mobile.game_cant_resume",
  bodyKey: "mobile.game_cant_resume_body",
  code: "WC-E02",
  clearsSave: true,
};
export const GL_LOST: Fatal = {
  kind: "gl_lost",
  headingKey: "mobile.game_cant_resume",
  bodyKey: "mobile.game_cant_resume_body",
  code: "WC-E03",
};
const CANT_START: Fatal = {
  kind: "cant_start",
  headingKey: "mobile.game_cant_start",
  bodyKey: "mobile.game_cant_start_body",
  code: "WC-E04",
};

const SPAWN_FAILED: Fatal = {
  kind: "spawn_failed",
  headingKey: "mobile.spawn_failed",
  bodyKey: "mobile.spawn_failed_body",
  code: "WC-E05",
  plain: true,
  clearsSave: true,
};

/**
 * Which upstream showErrorModal calls end the game on the phone. Offline the
 * only caller using connection_error is the createClientGame rejection
 * (server "error" messages never arrive without a server); the map loaders
 * say "Failed to load"/"Unknown map". A game where the player never got a
 * spawn is over too. Every other heading (desync, ...) keeps upstream's modal.
 */
export function fatalForHeading(heading: string, error: string): Fatal | null {
  if (heading === "error_modal.spawn_failed.title") return SPAWN_FAILED;
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
  appendError({
    code: `fatal.${fatal.kind}`,
    operation: fatal.code,
    message: detail,
    stack,
  });
  flushErrorLog();
  if (fatal.clearsSave) void saveStore.clear().catch(() => {});
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
  card.append(title, el("p", "wc-fatal-body", translateText(fatal.bodyKey)));
  if (!fatal.plain) {
    card.append(
      el(
        "p",
        "wc-fatal-detail",
        [fatal.code, shortDetail, version].filter(Boolean).join(" · "),
      ),
      el("p", "wc-fatal-report", translateText("mobile.fatal_report")),
    );
  }

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
    translateText("mobile.back_to_home"),
  );
  back.addEventListener("click", backToMenu);

  if (!fatal.plain) card.append(copy);
  card.append(back);
  root.append(card);
  document.body.append(root);
  back.focus();
}
