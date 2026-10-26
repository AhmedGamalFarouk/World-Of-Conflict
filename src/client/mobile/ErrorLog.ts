// A small on-device error log testers paste into a GitHub issue (About >
// Copy error log). Opted-in players also send each code (only the code) as
// an anonymous usage event (Analytics.ts). Homepage chunk: no game-client
// imports.
//
// localStorage "wc-errlog": JSON array, last 200 entries, each <= 2 KB,
// written at most once a second; the memory buffer is always current.
import { trackError } from "./Analytics";
import { appVersion, buildCommit } from "./AppInfo";
import { readPlayStats } from "./PlayStats";

export interface ErrorEntry {
  /** save.snapshot_failed, resume-desync, js.error, fatal.<kind>, ... */
  code: string;
  time: number;
  operation?: string;
  commits?: string;
  turn?: number;
  message?: string;
  stack?: string;
}

const KEY = "wc-errlog";
const MAX_ENTRIES = 200;
const MAX_ENTRY_BYTES = 2048;
const PERSIST_MS = 1000;

let buffer: ErrorEntry[] | null = null;
let lastPersist = 0;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

function entries(): ErrorEntry[] {
  if (buffer) return buffer;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    buffer = Array.isArray(parsed) ? (parsed as ErrorEntry[]) : [];
  } catch {
    buffer = [];
  }
  return buffer;
}

function persist(): void {
  persistTimer = null;
  lastPersist = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(entries()));
  } catch {
    // Blocked or full storage: the in-memory buffer still serves Copy.
  }
}

function schedulePersist(): void {
  if (persistTimer !== null) return;
  const wait = lastPersist + PERSIST_MS - Date.now();
  if (wait <= 0) persist();
  else persistTimer = setTimeout(persist, wait);
}

/** The entry with its text fields cut until it fits MAX_ENTRY_BYTES. */
export function fitEntry(entry: ErrorEntry): ErrorEntry {
  const e = { ...entry };
  const size = () => JSON.stringify(e).length;
  if (e.message && e.message.length > 300) e.message = e.message.slice(0, 300);
  if (e.stack && e.stack.length > 1200) e.stack = e.stack.slice(0, 1200);
  if (size() > MAX_ENTRY_BYTES) delete e.stack;
  if (size() > MAX_ENTRY_BYTES) delete e.message;
  return e;
}

export function appendError(entry: Omit<ErrorEntry, "time">): void {
  const list = entries();
  list.push(fitEntry({ ...entry, time: Date.now() }));
  if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
  schedulePersist();
  trackError(entry.code);
}

export function readErrorLog(): readonly ErrorEntry[] {
  return entries();
}

/** Writes now, e.g. before the page goes away. */
export function flushErrorLog(): void {
  if (persistTimer !== null) clearTimeout(persistTimer);
  persist();
}

/** Window-level capture. Worker errors and FatalScreen call appendError. */
export function installErrorLog(): void {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) =>
    appendError({
      code: "js.error",
      message: e.message,
      stack: e.error instanceof Error ? e.error.stack : undefined,
    }),
  );
  // A kill gives no warning: the last second of entries goes out when the
  // app leaves the screen.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushErrorLog();
  });
  window.addEventListener("pagehide", flushErrorLog);
  window.addEventListener("unhandledrejection", (e) => {
    const r: unknown = e.reason;
    appendError({
      code: "js.unhandled_rejection",
      message: r instanceof Error ? r.message : String(r),
      stack: r instanceof Error ? r.stack : undefined,
    });
  });
}

function header(): string {
  const ua = navigator.userAgent;
  const android = /Android (\d+(?:\.\d+)*)/.exec(ua)?.[1] ?? "?";
  const webview = /Chrome\/([\d.]+)/.exec(ua)?.[1] ?? "?";
  const stats = readPlayStats();
  const games = stats
    ? ` · games ${stats.started} started, ${stats.finished} finished`
    : "";
  return `World Of Conflict ${appVersion()} · build ${buildCommit()} · Android ${android} · WebView ${webview}${games}`;
}

/** What "Copy error log" puts on the clipboard. Never holds IDs. */
export function errorLogReport(): { text: string; count: number } {
  const list = entries();
  const body =
    list.length === 0
      ? "No errors logged"
      : list.map((e) => JSON.stringify(e)).join("\n");
  return { text: `${header()}\n${body}`, count: list.length };
}

/** Test-only. */
export function resetErrorLogForTests(): void {
  buffer = null;
  lastPersist = 0;
  if (persistTimer !== null) clearTimeout(persistTimer);
  persistTimer = null;
  installed = false;
}
