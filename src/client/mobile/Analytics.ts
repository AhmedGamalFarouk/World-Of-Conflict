// Opt-in anonymous usage stats (Aptabase): which modes people play, how games
// end, which error codes hit real phones. Off until the player says yes, and
// off in any build without an app key (WC_APTABASE_KEY at build time). No
// account, name or device ID: the session ID is new each launch (stored only
// inside queued events).
// Events made offline wait in localStorage (at most MAX_QUEUE) and go out
// with the next send. Plain fetch against Aptabase's event API
// (aptabase-js packages/shared.ts), so no SDK dependency.
import { appVersion, isDevBuild } from "./AppInfo";

/** Allowed through the offline guard (MobileShell.ts) and the CSP (index.html). */
export const ANALYTICS_ORIGINS = [
  "https://eu.aptabase.com",
  "https://us.aptabase.com",
] as const;

const CONSENT_KEY = "wc.analytics";
const QUEUE_KEY = "wc.analytics.queue";
const MAX_QUEUE = 100;

type Props = Record<string, string | number>;
interface AptabaseEvent {
  timestamp: string;
  sessionId: string;
  eventName: string;
  systemProps: {
    locale: string;
    isDebug: boolean;
    appVersion: string;
    sdkVersion: string;
  };
  props?: Props;
}

function appKey(): string {
  return typeof __WC_APTABASE_KEY__ === "string" ? __WC_APTABASE_KEY__ : "";
}

/** App keys look like "A-EU-1234567890"; the region picks the host. */
function endpoint(): string | null {
  const region = appKey().split("-")[1];
  const origin =
    region === "EU"
      ? ANALYTICS_ORIGINS[0]
      : region === "US"
        ? ANALYTICS_ORIGINS[1]
        : null;
  return origin && `${origin}/api/v0/event`;
}

/** Whether this build can send at all; the prompt and About hide otherwise. */
export const analyticsAvailable = (): boolean => endpoint() !== null;

/** null: never asked. Unreadable storage counts as "off": never nag. */
export function analyticsConsent(): "on" | "off" | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return "off";
  }
}

export function setAnalyticsConsent(on: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, on ? "on" : "off");
    if (!on) localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Not remembered: the player is asked again next launch.
  }
}

// Unix seconds plus 8 random digits, as the Aptabase SDKs make it.
const sessionId =
  Math.floor(Date.now() / 1000).toString() +
  Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, "0");

function readQueue(): AptabaseEvent[] {
  try {
    const q: unknown = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(q) ? (q as AptabaseEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: AptabaseEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {
    // Full or blocked storage: these events are lost, which is fine.
  }
}

let flushing: Promise<void> | null = null;

/** Sends queued events oldest first; stops at the first network failure. */
export function flushAnalytics(): Promise<void> {
  flushing ??= (async () => {
    const url = endpoint();
    let q = readQueue();
    while (url !== null && q.length > 0) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "App-Key": appKey() },
          body: JSON.stringify(q[0]),
          credentials: "omit",
          keepalive: true,
        });
      } catch {
        break; // Offline: try again with the next event.
      }
      // A 5xx may pass; a 4xx (bad key, bad event) never will, so drop it.
      if (res.status >= 500) break;
      q = readQueue().slice(1);
      writeQueue(q);
    }
  })().finally(() => (flushing = null));
  return flushing;
}

/** Records an event if the player opted in. Never throws. */
export function track(eventName: string, props?: Props): void {
  if (!analyticsAvailable() || analyticsConsent() !== "on") return;
  const q = readQueue();
  q.push({
    timestamp: new Date().toISOString(),
    sessionId,
    eventName,
    systemProps: {
      locale: navigator.language,
      isDebug: isDevBuild(appVersion()),
      appVersion: appVersion(),
      sdkVersion: "wc-fetch@1",
    },
    ...(props ? { props } : {}),
  });
  writeQueue(q);
  void flushAnalytics();
}

const sentErrors = new Set<string>();

/** One "error" event per code per launch: a looping error is one event. */
export function trackError(code: string): void {
  if (sentErrors.has(code)) return;
  sentErrors.add(code);
  track("error", { code });
}

/** Test-only. */
export function resetAnalyticsForTests(): void {
  sentErrors.clear();
  flushing = null;
}
