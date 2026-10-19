import { GameMapType, maps } from "@openfront/engine-api/game/GameTypes";
import { CURATED_MAP_IDS } from "./CuratedMaps";

const CURATED_MAPS: ReadonlySet<GameMapType> = new Set(
  maps.filter((m) => CURATED_MAP_IDS.includes(m.id)).map((m) => m.type),
);

// The mobile app (Capacitor) is built with `vite build --mode mobile`, so the
// shell is a build-time fact, not something to sniff at runtime like the
// Steam shell's preload global (DesktopShell.ts). `vite --mode mobile` gives
// the same client in a desktop browser for iterating on the phone UI.
export function isMobileShell(): boolean {
  return import.meta.env.MODE === "mobile";
}

// "offline": single-player only, nothing leaves the device.
// "own-server" is reserved for the online milestone (TODOS.md); one switch
// instead of scattered isMobileShell() checks at every online caller.
export type NetworkMode = "online" | "offline";

export function networkMode(): NetworkMode {
  return isMobileShell() ? "offline" : "online";
}

export function isOffline(): boolean {
  return networkMode() === "offline";
}

/**
 * Offline only: answer every fetch to another origin with a 503 instead of
 * letting it hit the page's CSP (index.html), which would reject it with a
 * console error. Upstream callers already fall back on a failed response, so
 * this one guard covers the API, news, cosmetics, auth and any caller added
 * later. Same-origin requests (maps, lang files, sounds) pass through.
 */
export function installOfflineNetworkGuard(): void {
  if (!isOffline()) return;
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const href = input instanceof Request ? input.url : String(input);
    if (new URL(href, window.location.href).origin !== window.location.origin) {
      console.debug("offline: blocked", href);
      return Promise.resolve(
        new Response(null, { status: 503, statusText: "Offline" }),
      );
    }
    return realFetch(input, init);
  };
  navigator.sendBeacon = () => false;
}

/** Whether this build ships the map's files. Always true on the web. */
export function isMapAvailable(map: GameMapType): boolean {
  return !isMobileShell() || CURATED_MAPS.has(map);
}
