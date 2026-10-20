# World Of Conflict — next steps (v0.2.0 release)

Start here in a new session. This is the only planning doc: it replaces the old
`PLAN.md`, `HANDOFF.md`, `PLAYTEST-PLAN.md`, `IMPROVEMENTS.md`, `RELEASE-PLAN.md`,
`docs/designs/playtest-readiness.md` and `TODOS.md` (all in git history).
Reviewed by /autoplan on 2026-10-21 (CEO, design, DX and eng phases) and
approved by the owner with `rec except uc1b`.

Other references: `PRODUCT.md` (product truth), `DESIGN.md` (design system,
the authority for all UI), `docs/mobile/ANDROID.md` (build, device checklist,
release gate), `CLAUDE.md` (repo rules: engine tests, i18n, layer boundaries).

## Where it stands

- Offline, landscape-locked Android app (Capacitor) adapting OpenFront. Single
  player vs bots. App id `com.worldofconflict.game` (permanent once on Play).
- Repo `AhmedGamalFarouk/World-Of-Conflict`, branch `main`. v0.1.0 tagged at
  `27b1001` (debug-signed tester APK, not published as a GitHub Release).
- Real-phone test passed (owner, 2026-10-21); numbers not yet recorded (A2).

## Before anything else (urgent)

- Do not run `gh release create` until A1 lands: upstream
  `.github/workflows/release.yml` fires on `release: published`.
- Do not save a keystore under `android/` until H1 lands: `android/.gitignore`
  has `*.jks` / `*.keystore` commented out.

## Rules that bind every step

- Engine untouched (`packages/engine*`). Mobile code lives in
  `src/client/mobile/`, `mobile-theme.css` (scoped to `body.mobile-theme`) and
  small `isMobileShell()` / `isOffline()` branches. No new dependencies.
- Homepage chunk never statically imports the game client; restore loads it
  through `GameClientLoader` (CLAUDE.md).
- All new UI text through `translateText()` with keys in `resources/lang/en.json`
  only (Crowdin owns other locales).
- Every new module gets a test; run targeted vitest files, `npm run typecheck`,
  `npm run lint` (not the 10-minute full suite).
- Owner decisions not to reopen: fork only, no outreach to OpenFront
  maintainers (gate uc1a); port first, no positioning claim beyond what the
  build does (uc2a); landscape only; ratio rail snapping 25/50/75/100; tap
  attacks, long-press opens the radial menu; keep the INTERNET permission;
  build order as below with no playtest gate before features (uc1b).

## Order

1. A1 + A3 + E1 (quick wins) first.
2. Then B (design), C (features) and the rest of E in parallel.
3. B8 (final mark) when the owner has it; if not by D17 asset capture, ship the
   current `wc_mark` and rebrand in a later minor.
4. D (release plumbing) → `version:set` → commit → tag `v0.2.0` → closed test.
5. A2 (device numbers) and A4 (trademark) gate only the tag.
6. C5 rule: Quick game (C2), save/resume (C1) and the event plate (B4) may be
   dropped to v0.2.1 if they would hold the tag.

Parallel lanes: Lane A: A → D (share `.github/`, `scripts/`). Lane B: B.
Lane C: C1 then C3/C4 (all touch `About.ts`, `Main.ts`). Rebase
`resources/lang/en.json` between lanes.

## Owner actions (give each a date in ANDROID.md "Release gate")

- A2 device numbers, A4 trademark search, B8 final mark, D1 upload keystore and
  key backup, D5 recruit 12+ closed testers (start now), D4 store assets.

---

## A — Release hygiene

**A1. Remove upstream automation.** Delete every upstream workflow
(`release.yml`, `deploy.yml`, `cherry-pick-milestone.yml`, `claude-code-review.yml`,
`issue-lifecycle-*.yml`, `pr-*.yml`) together with `scripts/pr-gate/`,
`scripts/issue-lifecycle/` and `tests/PrGateRules.test.ts`, in one commit.
Keep a trimmed `ci.yml` (typecheck, lint, targeted tests) that installs with
`npm run inst`. The upstream `.github/ISSUE_TEMPLATE/*` and
`PULL_REQUEST_TEMPLATE.md` get World Of Conflict wording or are deleted.
Test: `.github/workflows/` contains exactly `ci.yml` and `android-release.yml`.

**A2. Record the device test** in `ANDROID.md`: device model, Android and
WebView versions, median and 1%-low fps (min 5–15), OOM/crash result, 10
background/foreground cycles, back button, reverse landscape. The gate must be
run on a 4 GB device on Europe (largest curated map, `map.bin` 4.86 MB), not
only on World; if memory is tight, lower the offline default bot count
(`SinglePlayerModal.ts:103`, 400) or drop Europe from `CURATED_MAP_IDS`.
Human checklist line in the release gate, not automated.

**A3. CONTRIBUTING.md for this fork.** Replace the OpenFront text. Show the
debug path first, release second, with literal commands:
`npm run inst`, `npm run android:doctor`, `npm run android:debug`,
`adb install -r dist-mobile/WorldOfConflict-dev.apk`; dev uses
`build-mobile`/`android:sync`, release uses
`build-mobile:release`/`android:sync:release`. Explain the release gate, the
thin-layer rule, and that engine fixes belong upstream. Owner times a clean
clone → `android:debug` → install once and records the minutes (target ≤15 min
after JDK/SDK install).

**A4. Trademark check** (owner): "World Of Conflict" in EUIPO, USPTO and Play
Store; record the result in this file.

## B — Design defects

**B1. Splash.** The launch theme (`AppTheme.NoActionBarLaunch`) shows a plain
Night background (`--wc-night` #0b1020, exactly) with no directional mark, so
the portrait frame before `sensorLandscape` cannot draw it sideways. The
Capacitor web splash keeps the branded frame; its first frame matches the
native background and the mark fades in over 200 ms. Check cold and warm start:
no white frame.

**B2. Solo rail.** START sits directly under the last control at 844x390 and
640x320 (mobile CSS only).

**B3. spawn_failed panel** (`ClientGameRunner.ts:1091`). FatalScreen panel
under `body.mobile-theme`, title "COULD NOT SPAWN", one gold BACK TO HOME;
Android back does the same.

**B4. Critical event plate** (`CriticalEventPlate.ts`). Events for the local
player only: nuke inbound (`MessageType.NUKE_INBOUND`, `GameTypes.ts:454`),
ally betrayed (alliance-broken update `betrayedID`, `GameUpdates.ts:308`),
under attack (a new attack id in `incomingAttacks`, `GameUpdates.ts:274`; an id
never triggers twice). Priority nuke > betrayal > attack; a new event replaces
the plate only at equal or higher priority; attack plates at most one per 10 s
of game ticks; shows 4 s; tap dismisses; Android back dismisses it first.
Copy keys `event_plate.attack` "{name} is attacking you",
`event_plate.betrayal` "{name} broke your alliance", `event_plate.nuke`
"Nuke inbound from {name}"; name ellipsis after 18 chars. Look: plate with a
2px `--wc-red` top edge, 22px icon per type, Body 16px Ivory, max width
min(420px, clear of the rank and timer plates at 640px), top-centre at 12px +
safe area, directly below the tutorial banner while it shows; 8px rise + 180ms
fade, none under reduced motion; `aria-live` assertive for nuke/betrayal,
polite for attack. DESIGN.md gains the plate (Components) and Alarm Red
(Colors). Tests: priority, rate limit, dedupe.

**B5. Battery while paused.** Remove `backdrop-filter: blur` from `.wc-scrim`
(`mobile-theme.css:608`), use a darker solid scrim, and skip `onFrame`
(`ClientGameRunner.ts:631-635`) while the sim is paused and the camera is still.

**B6. Return from background stays paused.** `GameRightSidebar.ts:157-159`
unpauses as soon as the page is visible; instead keep the game paused and show
the pause card so the player resumes with a tap (clear `pausedByLifecycle`).

**B7. Android back stacking.** One guard in `showDialog`
(`src/client/InGameModal.ts:16-21`): if a `confirm-dialog` is open, back
resolves it as KEEP/cancel and returns, instead of stacking a new dialog and
another `gameplayStop()`. Test it.

**B8. Final brand mark** (owner). Replace `res/drawable/wc_mark.xml` and the web
wordmark, regenerate adaptive icon and splash.

## C — Phone features

**C1. Save and resume** (`src/client/mobile/SaveGame.ts`, game client chunk).

- Measure first: snapshot size and `snapshot()` time on Europe and World on the
  A2 device. Budget: no main-thread task over 50 ms. Over 5 MB → gzip with
  `CompressionStream` before storing. If over budget, the interval becomes
  120 s.
- Storage: IndexedDB store `wc-saves`, key `current`, through an injectable
  `IDBFactory` like `src/client/replay/ReplayStore.ts:285`. Save holds: snapshot
  bytes, turn list (intents) for turns 0..T−1 where T =
  `readSnapshotHeader(snapshot).tick`, the state hash at T, `GameConfig`,
  `gameStartInfo`, local `clientID`, speed multiplier, map name, elapsed game
  seconds, build git commit, saved-at time.
- When: every 60 s of game time (game ticks, never wall clock) and on
  Capacitor `appStateChange` to background (best effort; guarantee is "at most
  60 s of game time lost"). Listener registered at game start, removed at end.
- Safety: one snapshot in flight; ticks while pending are skipped; 10 s timeout
  around `WorkerClient.snapshot()` (no engine change); a `saveEpoch` checked
  before the request and before the put; game end, abandon, discard and
  elimination bump it; older-epoch results are dropped silently. Failed
  snapshot or `QuotaExceededError` keeps the previous save and logs
  `save.snapshot_failed`; after 3 in a row the pause card's saved line turns
  Ember "Saving paused". IndexedDB unavailable → no CONTINUE, logs
  `save.storage_unavailable` once.
- Restore: LocalServer starts with `turns` prefilled to the saved list, so the
  next turn number is T (numbering is `turns.length`, `LocalServer.ts:276`);
  intents queued past T are dropped; saved speed applied before the first
  turn; worker init with `snapshotToRestore`; the game opens paused, camera
  centred on the player's largest territory, header "RESUMED · TURN N · SAVED
  N MIN AGO". Right after restore, compare the restored state hash with the
  saved one; mismatch logs one `resume-desync`. A resumed game keeps a full game
  record (replay works). Restore loads the client through `GameClientLoader`.
- End: elimination records `loss`, clears the save and stops autosave; a win
  clears it.
- Home: with a save, a CONTINUE plate at the top of the title screen's right
  column (≤360px wide, ≤96px high): map name, elapsed mm:ss, "saved N min ago";
  CONTINUE is the gold face and PLAY turns steel; PLAY stays visible at
  640x320. Tap shows the loading screen at once; buttons disable until settled.
  DISCARD on the card and every game start with a save (PLAY, QUICK GAME, solo
  START, Play again) open "DISCARD SAVED GAME?" with KEEP (gold, also Android
  back) and DISCARD (steel; clears, records `abandoned`).
- Stale or broken save: discarded at boot; a notice plate in the card's slot
  (`save.stale` "Your saved game is from an older version and could not be
  restored", `save.damaged` "Your saved game was damaged and could not be
  restored"), tap to dismiss; records `abandoned`; logs the error. Dev builds
  report commit `DEV` and never go stale; tests inject the commit.
- Pause card: RESUME (gold), EXIT TO HOME (steel, saves now, keeps the save),
  ABANDON (steel, confirm, clears, records `quit`); "Saved N s ago" line.
- About: "Clear saved game" (only when a save exists), same confirm modal.
- Dev override: `localStorage` `wc.dev.autosaveSeconds`, ignored in release.
- Tests: node equivalence test (snapshot at T with turns queued, restore, 200
  more turns, per-turn hashes equal an uninterrupted run with the same seed
  and intents); resumed record replays to the same final hash; existing
  LocalServer replay tests stay green; timeout with a fake worker that never
  answers; epoch race (pause snapshot, end game, release → no save); quota
  error keeps the previous save; speed restored; stale/corrupt paths; each
  start entry shows the discard modal; override ignored in release.
- Device: force-stop and `adb shell am kill com.worldofconflict.game` mid-game,
  relaunch, CONTINUE.

**C2. Quick game.** A steel QUICK GAME button on home under PLAY starts a game
at once: the 3 smallest curated maps (by `map.bin`), 5 bots, speed
`ReplaySpeedMultiplier.fast` (0.5x turn interval). Provisional until 10 games
are logged in PlayStats, then retuned by hand toward 5–10 minute games. Solo
rail unchanged.

**C3. Vibration** (`Haptics.ts`, `navigator.vibrate`, already used at
`RadialMenu.ts:164`; VIBRATE permission exists). 15 ms on attack sent; 40 ms
when an attack plate shows (same 10 s limit). Setting "Vibration"
(`settings.vibration`) in the settings modal, default on; off = no calls.
DESIGN.md notes the in-app toggle is the reliable off switch.

**C4. Error log and stats.**

- `ErrorLog.ts` (homepage chunk): captures `window.onerror`,
  `unhandledrejection`, worker errors and FatalScreen (FatalScreen writes
  through `ErrorLog.append`). localStorage `wc-errlog`, JSON array, last 200,
  each entry ≤2 KB, persisted at most once per second; memory buffer always
  current. Each entry: `code` (`save.snapshot_failed`, `save.restore_failed`,
  `save.stale`, `save.damaged`, `save.storage_unavailable`, `resume-desync`,
  `errlog.clipboard_failed`, `js.error`, `js.unhandled_rejection`,
  `worker.error`, `fatal.<kind>`), operation, commits where relevant, turn,
  truncated stack.
- About "Copy error log": header line (app version, git commit, Android and
  WebView version from the user agent, PlayStats counts; never clientID or
  persistentID) then entries; "Copied (N entries)" toast 2 s; empty log copies
  the header + "No errors logged"; clipboard failure opens a panel with
  selectable text and logs `errlog.clipboard_failed`.
- `PlayStats`: per game, match length (game seconds) and end reason `win`,
  `loss`, `quit`, `abandoned`; `finished` counts only win/loss; resume adds
  nothing to `started`; length is total game time. About shows
  "MEDIAN GAME N MIN · LAST 20" from win/loss games, hidden below 3,
  "(provisional)" below 10; hidden on storage failure.
- `SoloReplay` validates stored config with `GameConfigSchema.safeParse`;
  invalid → falls back to the solo setup screen.
- Tests for ErrorLog, PlayStats, SoloReplay and `MobileBack` routing.

## D — Release plumbing

**D1. Signing and builds.**

- H1 first: uncomment `*.jks` / `*.keystore` in `android/.gitignore`; add
  `keystore.properties`, `*.jks`, `*.keystore` to the root `.gitignore`; the
  gate fails `WC_GATE_KEYSTORE_TRACKED` if `git ls-files` lists any.
- Upload keystore outside the repo; commit `android/keystore.properties.example`;
  Gradle reads `android/keystore.properties` for a `release` signingConfig;
  `minifyEnabled false` for v0.2.0; Play App Signing on; key backup documented
  (`keytool -genkeypair -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`).
- `npm run android:doctor`: Java 21, `ANDROID_HOME`/`ANDROID_SDK_ROOT`, Gradle
  wrapper (and `adb` for debug only); each miss prints `WC_DOCTOR_<ITEM>` with
  the fix and exits non-zero. Runs first in `android:release`.
- `npm run android:debug`: sync + `assembleDebug` →
  `dist-mobile/WorldOfConflict-dev.apk`, prints `READY <path> (<size> MB)`.
- `npm run android:release`: signed `bundleRelease` and `assembleRelease` →
  `dist-mobile/WorldOfConflict-vX.Y.Z.aab` and `.apk`, prints paths, sizes and
  the `gh release upload` line. Missing properties → `WC_SIGNING_MISSING`
  (names the example file and `android:debug`); bad password →
  `WC_SIGNING_INVALID`; no secret values printed. AAB over 150 MB →
  `WC_GATE_AAB_SIZE` with size, limit and the 5 largest folders.
- Versioning: `npm run version:set -- X.Y.Z` writes versionName and versionCode
  (`major*10000+minor*100+patch`, v0.2.0 = 200); the gate refuses a mismatch
  (`WC_GATE_VERSION_CODE` prints the expected number) and any tag suffix.
  Every Play upload gets its own patch tag. Order: `version:set` → commit →
  tag → push tag.
- Trim the APK: exclude web-only resources in `copyMobileResources`
  (`scripts/mobileBuild.ts:25-31`): `press/` (12 MB), `ads.txt`, `news.json`,
  `streams.json`, `privacy-policy.html`, `terms-of-service.html`,
  `changelog.md`, `lemon-drizzle.md`; check whether all of `flags/` (26 MB) is
  needed offline; re-run the curated-map check.
- Mobile build forces `cdnBase: ""` and `assetManifest: {}` (`vite.config.ts:308`,
  346-358). Optional: the origin check also scans emitted `.css` for
  `url(http…)`/`@import`.
- Manifest: `android:allowBackup="false"`; delete the unused FileProvider block
  and `res/xml/file_paths.xml`.
- Remove the dead `SOURCE_URL_PLACEHOLDER` (`AppInfo.ts:5`), the
  `WC_GATE_PLACEHOLDER_URL` branch (`scripts/mobileBuild.ts:127-130`) and its
  test case.
- About's AGPL source link points at `${SOURCE_URL}/tree/<tag>` in release
  builds (root link in dev).
- `LocalServer.archiveGameRecord` is skipped under the mobile shell; the
  offline runtime test asserts no non-local request after a finished game.
- Device smoke test of the signed release APK: full offline game, resume after
  force-stop.

**D2. CI** `.github/workflows/android-release.yml`. On `v*` tag: JDK 21 +
Android SDK, `npm run inst`, `npm run android:release` run directly (any gate or
Gradle failure fails the job), `gh release upload --clobber` of AAB and APK
(re-runs are safe). Keystore from secret `ANDROID_KEYSTORE_B64`
(`base64 -w0 upload.jks | gh secret set ANDROID_KEYSTORE_B64`), decoded into
`$RUNNER_TEMP`, never echoed, passwords as env vars, deleted in an
`if: always()` step, never uploaded. Also `workflow_dispatch` with
`dry_run: true` (default) that builds and uploads a workflow artifact without
touching any Release; use it before the first tag.

**D3. Privacy policy.** `docs/privacy.html`, GitHub Pages "deploy from branch"
(`main` `/docs`), no workflow. Says: the app makes no network requests and
collects no data; local-only storage (stats, saves, error log). Linked from
About and the listing.

**D4. Play listing.** World Of Conflict branding only; "OpenFront" only as the
CC BY-SA attribution and AGPL source credit. Factual copy: offline single
player vs bots, quick game, resume after interruption; non-monetized hobby
release; minimum spec Android 8.0 (minSdk 26) with a WebGL2 WebView; AGPL
source link. Screenshots 1920x1080 (16:9; 844x390 breaks Play's 2:1 limit):
home with CONTINUE, mid-game territory, event plate, QUICK GAME start,
aftergame. Feature graphic 1024x500. Content rating, data safety "no data
collected".

**D5. Closed test.** New personal developer accounts need a closed test with
at least 12 opted-in testers for 14 continuous days before production (owner
confirms account type). Recruit now. Feedback: GitHub issues plus pasted
"Copy error log". Enable pre-launch reports. targetSdk 36 meets the Play floor;
recheck at upload.

**D6. Docs.** `ANDROID.md`: signing section with the literal commands above,
release order, "Error codes" table (`WC_GATE_*`, `WC_SIGNING_*`,
`WC_DOCTOR_*`, `WC_GRADLE_FAILED`, ErrorLog codes) with anchors matching script
output, and a tester crash-report runbook (ask for Copy error log, match the
header commit to the tag, file an issue; `adb logcat -s Capacitor chromium`).

## Done when (v0.2.0 public-release ready)

- Closed test ran 14 days with ≥12 testers.
- No unresolved crash reports from tester error logs.
- ≥5 testers finished 3+ games (from their pasted PlayStats line).
- A2 numbers and A4 result recorded; release APK smoke test passed.

## Later (not in v0.2.0)

- Online multiplayer on our own server (`MobileShell` network mode
  `"own-server"`; add `"android"` to `ClientPlatform`); needs auth/stats
  replaced or dropped.
- iOS (research AGPL vs App Store terms first).
- On-demand map downloads beyond the 15 curated maps (`curatedMaps()`).
- In-app "Report a problem" to a prefilled GitHub issue (needs an
  external-link policy).
- Daily seeded challenge map (decide after the closed test).
- Monthly upstream merge from OpenFrontIO with the gate rerun.
- Devcontainer/Docker build image (if contributors ask).

## How to run

```bash
npx -y npm@12 ci --ignore-scripts
```

- Browser preview: `.claude/launch.json` config `mobile-preview` (port 9100,
  serves `dist-mobile/`), viewport 844x390; rebuild with `npm run build-mobile`
  after each change and add `?v=N` to bust the cache.
- APK today: `npm run android:sync`, then in `android/`
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug`.
- Emulator: AVD `Pixel_9_API_Baklava`; prefix adb commands that take
  `/sdcard/…` with `MSYS_NO_PATHCONV=1` in Git Bash.
- Known noise: 18 `update.sh` tests fail on Windows on clean `main`; some
  client tests (MainInitialize, RewardTrack, InventoryModal) time out under
  load and pass alone.
