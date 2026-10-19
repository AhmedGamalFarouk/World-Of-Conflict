// Build steps for the mobile (Capacitor) app: `vite build --mode mobile`.
//
//   resources/ ──copy, minus non-curated maps──┐
//   resources/public/ ──to the site root───────┼──> dist-mobile/ ──checkMobileDist()
//   mobile/assets/ ──overlay (replaces proprietary/)┘
//
// vite.config.ts calls these from a closeBundle hook; tests/MobileBuild.test.ts
// runs checkMobileDist against fixtures.
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { copyRootPublicFiles } from "../src/server/PublicAssetManifest";

const MAP_FILES = ["map.bin", "map4x.bin", "map16x.bin", "manifest.json"];

export function copyMobileResources(
  resourcesDir: string,
  overlayDir: string,
  outDir: string,
  curatedMapFolders: string[],
): void {
  const curated = new Set(curatedMapFolders);
  const mapsDir = path.join(resourcesDir, "maps");
  const publicDir = path.join(resourcesDir, "public");
  fs.cpSync(resourcesDir, outDir, {
    recursive: true,
    filter: (src) => {
      if (src === publicDir || src.startsWith(publicDir + path.sep))
        return false;
      if (path.dirname(src) === mapsDir) return curated.has(path.basename(src));
      return true;
    },
  });
  copyRootPublicFiles(publicDir, outDir);
  fs.cpSync(overlayDir, outDir, {
    recursive: true,
    filter: (src) => path.basename(src) !== "README.md",
  });
}

function filesUnder(dir: string): string[] {
  return fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));
}

// Forward slashes in messages, whatever the OS.
function rel(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

function sha256(file: string): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(file))
    .digest("hex");
}

/** Returns every problem found; empty means the build is shippable. */
export function checkMobileDist(
  outDir: string,
  proprietaryDir: string,
  curatedMapFolders: string[],
): string[] {
  const errors: string[] = [];

  // 1. No proprietary bytes anywhere in the output (license). The LICENSE
  //    text is excluded: it is not an asset and resources/ has its own.
  const proprietary = new Map(
    filesUnder(proprietaryDir)
      .filter((f) => path.basename(f) !== "LICENSE")
      .map((f) => [sha256(f), rel(proprietaryDir, f)]),
  );
  for (const file of filesUnder(outDir)) {
    const match = proprietary.get(sha256(file));
    if (match) {
      errors.push(
        `${rel(outDir, file)} is proprietary/${match} (all rights reserved)`,
      );
    }
  }

  // 2. Nothing in index.html loads from another origin (offline + privacy).
  const html = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
  for (const [, attr, url] of html.matchAll(
    /\b(src|href)\s*=\s*["']((?:https?:)?\/\/[^"']+)/gi,
  )) {
    errors.push(`index.html ${attr} loads from another origin: ${url}`);
  }

  // 3. Every map the UI offers has its files.
  for (const folder of curatedMapFolders) {
    for (const name of MAP_FILES) {
      if (!fs.existsSync(path.join(outDir, "maps", folder, name))) {
        errors.push(`maps/${folder}/${name} is missing`);
      }
    }
  }

  return errors;
}

// ---- Release gate (docs/mobile/PLAYTEST-PLAN.md D3) ----
//
// `npm run build-mobile:release` must not produce an APK that can't legally
// leave the machine: the About screen has to link the real public source and
// the build has to match a clean, pushed release tag. Pure so it is tested
// without a git repo; vite.config.ts feeds it git's output.

export interface ReleaseState {
  sourceUrl: string;
  placeholderUrl: string;
  /** `git status --porcelain` output. */
  porcelain: string;
  /** `git describe --tags --exact-match`, or null when HEAD has no tag. */
  exactTag: string | null;
  /** versionName from android/app/build.gradle, or null if not found. */
  versionName: string | null;
  tagPattern: RegExp;
}

/** Every reason the build is not a release, each with its code and fix. */
export function checkReleaseGate(s: ReleaseState): string[] {
  const errors: string[] = [];
  const doc = "see docs/mobile/ANDROID.md#release-gate";
  if (s.sourceUrl === s.placeholderUrl) {
    errors.push(
      `WC_GATE_PLACEHOLDER_URL: SOURCE_URL is still ${s.sourceUrl}. Fix: edit SOURCE_URL in src/client/mobile/AppInfo.ts (${doc})`,
    );
  } else if (!s.sourceUrl.startsWith("https://github.com/")) {
    errors.push(
      `WC_GATE_SOURCE_URL: SOURCE_URL ${s.sourceUrl} is not a https://github.com/ repo. Fix: point it at the public World Of Conflict repo (${doc})`,
    );
  }
  const dirty = s.porcelain.trim();
  if (dirty) {
    errors.push(
      `WC_GATE_DIRTY: uncommitted changes (untracked files count too):\n    ${dirty.split("\n").join("\n    ")}\n  Fix: commit or git stash -u (${doc})`,
    );
  }
  if (s.exactTag === null) {
    errors.push(
      `WC_GATE_UNTAGGED: HEAD has no tag. Fix: git tag vX.Y.Z && git push origin vX.Y.Z (${doc})`,
    );
  } else if (!s.tagPattern.test(s.exactTag)) {
    errors.push(
      `WC_GATE_BAD_TAG: tag ${s.exactTag} is not vX.Y.Z, so the app would show DEV BUILD. Fix: tag the commit vX.Y.Z (${doc})`,
    );
  } else if (s.versionName !== s.exactTag.slice(1)) {
    errors.push(
      `WC_GATE_VERSION_NAME: android/app/build.gradle versionName is ${s.versionName ?? "missing"}, tag is ${s.exactTag}. Fix: set versionName "${s.exactTag.slice(1)}" and bump versionCode, then commit and re-tag (${doc})`,
    );
  }
  return errors;
}
