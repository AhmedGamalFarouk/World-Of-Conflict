// What the About screen and the release gate both need to agree on. No DOM:
// vite.config.ts imports this file in Node for the release gate.

/** Placeholder until the public World Of Conflict repo exists. */
export const SOURCE_URL_PLACEHOLDER = "https://github.com/OWNER/REPO";

/** The public source repo every shared APK links to (AGPL-3.0). */
export const SOURCE_URL =
  "https://github.com/AhmedGamalFarouk/World-Of-Conflict";

export const OPENFRONT_SOURCE_URL =
  "https://github.com/openfrontio/OpenFrontIO";
export const AGPL_URL = "https://www.gnu.org/licenses/agpl-3.0.html";
export const CC_BY_SA_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

/** The only tag shape a release may carry; anything else is a dev build. */
export const RELEASE_TAG_RE = /^v\d+\.\d+\.\d+$/;

/** `git describe` output from the mobile build, or "dev" anywhere else. */
export function appVersion(): string {
  return typeof __WC_VERSION__ === "string" ? __WC_VERSION__ : "dev";
}

export function isDevBuild(version: string): boolean {
  return !RELEASE_TAG_RE.test(version);
}
