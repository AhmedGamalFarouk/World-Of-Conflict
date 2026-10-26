# World Of Conflict — next steps (after v0.2.0)

Start here in a new session. Other references: `PRODUCT.md`, `DESIGN.md`
(authority for UI), `docs/mobile/ANDROID.md` (build, signing, error codes, device
record), `docs/mobile/STORE-LISTING.md` (Play copy and declarations),
`CLAUDE.md` (repo rules).

## Where it stands

- Offline, landscape-locked Android app (Capacitor) adapting OpenFront. Repo
  `AhmedGamalFarouk/World-Of-Conflict`, branch `main`, **v0.2.0 tagged and
  released** (2026-10-22); CI and the release workflow pass. Everything in
  sections 1 and 2 is committed. Section 3's vivo V2529 numbers are in
  `ANDROID.md`; catch-up shows a progress line on the pause card and asks before
  resuming a long game.
- Remaining work is owner actions (section 5) and the open items in section 4.
  The README and `STORE-LISTING.md` are ready to publish from.

## Rules that still bind every step

- Engine untouched (`packages/engine*`). Mobile code lives in
  `src/client/mobile/`, `mobile-theme.css` (scoped to `body.mobile-theme`) and
  small `isMobileShell()` / `isOffline()` branches. No new dependencies.
- The homepage chunk never statically imports the game client.
- UI text through `translateText()`, keys in `resources/lang/en.json` only.
- Every new module gets a test; run targeted vitest files, `npm run typecheck`,
  `npm run lint`, not the 10-minute suite.
- Owner decisions not to reopen: fork only, no outreach to OpenFront; port
  first, no claims beyond what the build does; landscape only; ratio rail
  25/50/75/100; tap attacks, long-press opens the radial menu; keep the
  INTERNET permission.

## 1. Fix first (blockers) — done

1. **Elimination never clears the save.** Nothing emits `GameOverEvent`
   (`src/client/mobile/SaveEvents.ts`); only the `winner` message clears the
   save (`LocalServer.ts`). A dead player keeps autosaving, EXIT saves again,
   home offers CONTINUE for a lost game, and resuming counts a second loss.
   Fix: in `WinModal.show()` (offline, first call) emit
   `GameOverEvent(isWin ? "win" : "loss")` on the event bus. Add a test that
   drives `WinModal.show`, not one that emits the event by hand
   (`tests/client/mobile/LocalServerResume.test.ts:169` does).
2. **Release CI cannot build.** `android/gradlew` is committed as mode 100644,
   so `./gradlew` on ubuntu fails and is reported as `WC_GRADLE_FAILED`. Fix:
   `git update-index --chmod=+x android/gradlew` (or a `chmod +x` step in
   `.github/workflows/android-release.yml`).

## 2. Should fix before screenshots and the closed test — done

3. **Pause card too tall for short screens** (`mobile-theme.css`, `.wc-pause-card`):
   341px normal, 403px when resumed, against 320px at 640x320. Add
   `max-height: calc(100dvh - 16px); overflow-y: auto` and a compact layout
   under `@media (max-height: 400px)` (saved line inline, smaller title and
   RESUME).
4. **Title screen at 640x320 with a save**: QUICK GAME and TUTORIAL sit at
   y 308 to 356, off screen (PLAY stays visible). Put CONTINUE beside the map
   info in the short media query, or shrink the rows, so all four fit.
5. **A resume counts as a started game** (`ClientGameRunner.ts`, the
   `gameStarted()` call). Guard with `!lobbyConfig.resume`, with a test.
6. **Event plate fires on old events during catch-up** (`CriticalEventPlate.ts`
   `tick()`): replayed attacks, nukes and betrayals produce plates, vibration
   and screen-reader alerts. Return early while `game.isCatchingUp()` or
   `ticks() < resume.turnCount`, and mark attacks already in progress as seen
   when catch-up ends.
7. **B1 launch frame does not work** (`index.html`): `html.preload` paints
   `#111827` and hides `body`, which holds `#wc-boot`, so the player sees a
   colour step and never the mark. In the mobile branch set
   `html.preload { background-color: #0b1020 !important }` and
   `#wc-boot { visibility: visible }`, and remove the frame after the first
   real paint, not on `load`. `tests/AndroidResources.test.ts` only matches
   strings; check it on a device cold and warm.
8. **Boot race can overwrite a save without asking** (`SaveHome.ts`
   `allowNewGame`): it reads state that `loadHomeSave()` fills asynchronously
   (IndexedDB can take 4 s). A new game started in that window skips the
   discard dialog and its first autosave overwrites the old save; a late stale
   `clear()` can bump the epoch and silently stop that game from saving.
   Keep the `loadHomeSave` promise and await it in `allowNewGame` and before
   `LocalServer.startSaver` takes its epoch.
9. **The dry run cannot run before the first tag.** The release gate needs HEAD
   on a tag, and any `v*` push runs the upload. Add a `WC_DRY_RUN=1` mode that
   skips only the tag check (still checks `versionName` and `versionCode`),
   set by the `workflow_dispatch` path. `dry_run: false` on a manual run
   currently uploads nothing.
10. **EXIT TO HOME timeout path** (`GameRightSidebar.ts` `keepGameOnExit`): on a
    failed or slow save it disposes the saver and records `quit` but leaves the
    old save, so CONTINUE is still offered and the game's end is counted twice
    later. Either keep the save and skip `quit`, or `await saver.finish()`
    before recording `quit`.
11. **Keystore check misreports** (`scripts/androidRelease.ts`): `keytool` comes
    from PATH, not `$JAVA_HOME/bin`, so Android Studio's jbr alone gives a
    false `WC_SIGNING_INVALID`; `shell: true` on Windows splits a `storeFile`
    with spaces; a relative `storeFile` resolves from the repo root but Gradle
    resolves it from `android/app`. Use `path.join(JAVA_HOME, "bin", "keytool")`
    with `shell: false` and require an absolute `storeFile`.

## 3. Measure on the A2 device (decides whether C1 stays in v0.2.0)

Resume replays every saved turn: an hour-long game is 36,000 turns sent in one
message, then 36,000 worker ticks with the HUD updating. On a mid-range phone on
Europe that could take minutes, and nothing caps or tests it.

- Play 25+ minutes on Europe, `adb shell am force-stop com.worldofconflict.game`,
  relaunch, CONTINUE. Record catch-up time, whether the camera centres, whether
  the pause card fits, and whether `resume-desync` shows in Copy error log.
  **Partly measured (2026-10-21, vivo V2529, 7.3 GB, see `ANDROID.md`):** about
  190 ticks/s, so 25 game minutes catch up in about 80 s and an hour in about
  3 minutes (no player activity; the game ended at game minute 13, so the
  long runs were extrapolated). No `resume-desync`; the pause card shows
  "Catching up…" and the win modal can appear during catch-up. Still to do on
  the 4 GB phone and with a surviving, active player: the camera centring and a
  real 25-minute game. Decision pending: 80 s to 3 minutes is long enough to
  want a cap or a "Catching up" progress line on the pause card.
- If catch-up is minutes, either cap it (save the turn list but resume only
  from a game under N minutes, otherwise offer to discard), or drop save and
  resume, Quick game and the event plate to v0.2.1 as the old plan's C5 rule
  allowed. An engine snapshot is the proper fix but needs an engine change
  (a full baseline update after restore), which the rules forbid today.
- Get eliminated, then exit from the win modal and from the pause card: home
  must show no CONTINUE and PlayStats must count one loss. **Done for the win
  modal on the phone (2026-10-21):** no CONTINUE, one loss counted (also when a
  nation won during a resume catch-up). The pause-card exit after elimination
  is untested.
- Background the app mid-game for a minute and return: the pause card must show,
  the map behind it must still be drawn (the battery frame skip in
  `ClientGameRunner.ts` never forces a redraw on return), and EXIT and ABANDON
  must be reachable at the phone's real landscape height.
- Cold and warm start: no white frame and no `#111827` step (see item 7).
- Also record the A2 numbers in `ANDROID.md`: model, Android and WebView
  versions, median and 1%-low fps, crash or OOM, 10 background cycles, back
  button, reverse landscape. Use a 4 GB phone on Europe; if memory is tight
  lower the offline default bots (`SinglePlayerModal.ts`, 400) or drop Europe
  from `CURATED_MAP_IDS`.

## 4. Smaller follow-ups

Done in the second pass: the `InGameModal` back guard (now in `MobileBack`), error
log flush on `visibilitychange`/`pagehide` and in `showFatal`, the header label
(`build`), boat-attack vibration, save cleared on `CRASHED`/`spawn_failed`,
CONTINUE stays disabled after the join, new CSS scoped under `body.mobile-theme`,
keystore backslash escaping, a resumed (paused) game skips frames and a redraw is
forced on return from the background. Item 5's `gameStarted` resume guard has
no direct test (it sits inside `createClientGame`).

Open:

- **Owner decision:** Quick game uses `nations: "default"`, which adds AI nations beyond the 5
  bots. Decide if that is wanted.
- `tests/Workflows.test.ts` checks secrets only with a regex. A real YAML lint
  would need a new dependency (`yaml` is only transitive), and CI parses the
  workflows on every push, so this is dropped.
- Tests added in the third pass: every start entry goes through `allowNewGame`
  (source wiring test), saved speed restored by `LocalServer`, `save.restore_failed`
  is now logged and tested. Still missing: an offline runtime test asserting no
  non-local request after a finished game.
- `dist-mobile/` is 86 MB uncompressed (maps 39, flags 26, images 11), well under
  the 150 MB AAB gate; `resources/flags/` stays. The gate itself still needs a
  real release build to prove.
- B2 (solo rail): the plan's "START directly under the last control" could not
  be reproduced; the rail holds only START and is pinned to the bottom.
  `DESIGN.md` still lists "empty space above START" as an open item.
- Opt-in usage stats (Aptabase) are built; the events list lives in the callers
  of `src/client/mobile/Analytics.ts`. Off by default, no key means no sends.
- `E1` was named in the first plan's Order but never defined; nothing built.

## 5. Owner actions (give each a date in `ANDROID.md`)

- A2 device numbers (section 3). A4 trademark search: "World Of Conflict" in
  EUIPO, USPTO and the Play Store; record the result here.
- B8: the final brand mark (replace `res/drawable/wc_mark.xml` and the web
  wordmark, regenerate adaptive icon). If it is not ready by store asset
  capture, ship the current mark and rebrand in a later minor.
- D1: create the upload keystore (outside the repo), back it up, fill
  `android/keystore.properties`, add the four CI secrets
  (`ANDROID_KEYSTORE_B64`, `_PASSWORD`, `ANDROID_KEY_ALIAS`, `_KEY_PASSWORD`).
- Turn on GitHub Pages from `main` `/docs` so `docs/privacy.html` is served at
  the URL About links to (Play needs this URL before submission; not enabled as
  of 2026-10-22).
- Write the v0.2.0 release notes on the GitHub Release (empty now).
- D4 store assets: screenshots 1920x1080 (home with CONTINUE, mid-game
  territory, event plate, QUICK GAME start, aftergame), feature graphic
  1024x500, content rating, data safety (usage stats declarations, see
  `STORE-LISTING.md`). Copy is World Of
  Conflict only; "OpenFront" appears only as the CC BY-SA and AGPL credit.
  Offline single player vs bots, quick game, resume after interruption;
  non-monetized; minSdk 26 with a WebGL2 WebView; AGPL source link.
- D5 closed test: a personal developer account needs 12+ opted-in testers for
  14 continuous days before production. Recruit now. Feedback via GitHub issues
  with pasted Copy error log; enable pre-launch reports; recheck targetSdk at
  upload.
- Usage stats: create an Aptabase app (EU region recommended), set the repo
  variable `WC_APTABASE_KEY`, update the Play Data safety form (see
  `STORE-LISTING.md`), and republish `docs/privacy.html` via GitHub Pages.
- Time a clean clone to `android:debug` to install once and record the minutes
  (target 15 or less after JDK and SDK install) in `CONTRIBUTING.md`.

## 6. Release order

1. Commit the first-pass work (it is all uncommitted) in reviewable pieces.
2. Fix section 1, then section 2.
3. Dry-run the release workflow (needs item 9), then `npm run version:set -- 0.2.0`,
   commit, tag `v0.2.0`, push the tag.
4. Closed test (14 days, 12+ testers).

Done when: the closed test ran 14 days with 12+ testers, no unresolved crash
reports in tester error logs, at least 5 testers finished 3+ games (from their
pasted play-stats line), A2 numbers and the A4 result are recorded, and the
signed release APK passed a full offline game plus resume after force-stop.

## Later (not in v0.2.0)

- Online multiplayer on our own server (`MobileShell` network mode
  `"own-server"`; add `"android"` to `ClientPlatform`).
- iOS (research AGPL vs App Store terms first).
- On-demand map downloads beyond the 15 curated maps.
- In-app "Report a problem" to a prefilled GitHub issue.
- Daily seeded challenge: built (`src/client/mobile/DailyChallenge.ts`, game ID
  `D<yyyymmdd>` UTC seeds the engine; local streak only). Untested on a device
  and with a CONTINUE plate at 640x320.
- Monthly upstream merge from OpenFrontIO with the gate rerun.
- Engine snapshot resume (needs a baseline-update engine change; see section 3).

## How to run

```bash
npx -y npm@12 ci --ignore-scripts
```

- Browser preview: `.claude/launch.json` config `mobile-preview` (port 9100,
  serves `dist-mobile/`), viewport 844x390; rebuild with `npm run build-mobile`
  after each change and add `?v=N` to bust the cache. For quick save tests set
  `localStorage["wc.dev.autosaveSeconds"]` (dev builds only).
- APK: `npm run android:doctor`, `npm run android:debug`,
  `adb install -r dist-mobile/WorldOfConflict-dev.apk`.
- Emulator: AVD `Pixel_9_API_Baklava`; prefix adb commands that take
  `/sdcard/…` with `MSYS_NO_PATHCONV=1` in Git Bash.
- Known noise: 18 `update.sh` tests fail on Windows on clean `main`; some
  client tests (MainInitialize, RewardTrack, InventoryModal) time out under
  load and pass alone.
