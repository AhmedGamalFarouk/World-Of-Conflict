# Handoff: World Of Conflict mobile (as of 2026-10-19)

Read this first in a new session. Then read, as needed: `PRODUCT.md` (product
truth), `docs/mobile/PLAN.md` (approved plan, the `autoplan-accepted` blocks are
binding), `DESIGN.md` (shipped design system), `docs/mobile/ANDROID.md` (APK
build and the feasibility-gate checklist), `TODOS.md` (deferred work), and
`CLAUDE.md` (repo rules: tests for engine changes, i18n, layer boundaries).

## What this is

An offline, landscape-locked Android adaptation of OpenFront (fork of
OpenFrontIO). Single player vs bots, no server. The web client runs in a
Capacitor shell; the engine is untouched. App id `com.worldofconflict.game`
(confirmed, permanent once on Play). Name "World Of Conflict".

## Where it stands

Branch `mobile/offline-build` (base `main` = upstream `5e4b55a`). Nothing is
pushed and there is no PR.

| Commit    | What                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `f56bf43` | Offline build mode (`npm run build-mobile` → `dist-mobile/`), mobile shell, CSP, curated maps, open assets                                                                |
| `0bc101d` | Online UI hidden, boot-time online callers gated, Android back wired                                                                                                      |
| `2b68372` | Capacitor Android project (`android/`), debug APK, `docs/mobile/ANDROID.md`                                                                                               |
| `dad1288` | Full UI redesign (category-standard game UI), vector icon + splash, `PRODUCT.md`, `DESIGN.md`                                                                             |
| `9b09c29` | Tap enemy/neutral land attacks at the current ratio; long-press (450 ms) or tapping own land opens the radial menu; "Tap to Open Menu" setting restores the old behaviour |

Plan steps (PLAN.md): 1 license/assets done · 2 offline web build done ·
3 Capacitor APK done (emulator only) · **feasibility gate not run yet** ·
4 mobile UX pass largely done (redesign + tap-to-attack) but still owes
on-device confirmation · 5 rebrand partly done (name, wordmark, placeholder
mark, icon, splash; About screen not built).

## Next steps, in order

1. **Feasibility gate on a real phone** (owner action, needs a device): 4 GB RAM,
   Snapdragon 6-series class, Android 11+. Checklist in `docs/mobile/ANDROID.md`
   (offline full game on World, median ≥30 fps min 5–15, no OOM, 10
   background/foreground cycles, back button, reverse landscape). Record results
   in ANDROID.md. On a fps miss: smaller maps → mobile `GraphicsOverrides` →
   higher device floor (PLAN.md order).
2. **First release (owner):** About, fatal screens and the release gate are
   built (docs/mobile/PLAYTEST-PLAN.md, reviewed by /autoplan). Left: create
   the public repo, set `SOURCE_URL` in `src/client/mobile/AppInfo.ts`, set
   `versionName "0.1.0"`, tag `v0.1.0`, then `npm run android:release` and the
   checklist in ANDROID.md "Release gate". The gate refuses anything else.
3. **Remaining HUD items:** the top-centre critical event plate is deferred
   until playtest evidence (TODOS.md); check event feed placement in a real
   mid-game.
4. **Open design items** (DESIGN.md "Known Open Items"): system splash portrait
   frame draws the mark sideways during the launch rotation (Android window
   orientation, not the vector); placeholder brand mark; empty space above
   START on the solo rail.
5. **Playtest / product gate** after the UX pass: 5–10 players, log per PLAN.md
   (≥60% finish a game, ≥40% start a second).
6. Then `TODOS.md` (short-session mode, save/resume, haptics, store release…).

## How to run it

```bash
npx -y npm@12 ci --ignore-scripts # deps (repo needs npm 12; machine has 11)
npm run build-mobile              # offline web build → dist-mobile/
```

- Browser preview: `.claude/launch.json` config `mobile-preview` (port 9100,
  serves `dist-mobile/`). Use phone landscape `844x390`. After a rebuild add
  `?v=N` to the URL (the pane caches CSS). Rebuild after every source change;
  it is a static build, not HMR.
- APK: `npm run android:sync`, then in `android/`
  `JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug`
  → `android/app/build/outputs/apk/debug/app-debug.apk` (~62 MB).
- Emulator: AVD `Pixel_9_API_Baklava`
  (`/c/Users/Ahmed/AppData/Local/Android/Sdk/emulator/emulator -avd Pixel_9_API_Baklava`),
  `adb install -r <apk>`. In Git Bash prefix adb commands that take `/sdcard/…`
  paths with `MSYS_NO_PATHCONV=1`.
- Checks: `npm run typecheck`, `npm run lint`, `npx vitest run`. Baseline: 18
  `update.sh` tests fail on Windows on clean `main` too; some client tests
  (MainInitialize, RewardTrack, InventoryModal) time out under load and pass in
  isolation.

## How the mobile layer is built (keep it thin)

Rule: mobile changes stay in the mobile layer so upstream merges stay cheap.
Never touch `packages/engine*`.

- `src/client/mobile/MobileShell.ts`: `isMobileShell()` (build-time:
  `import.meta.env.MODE === "mobile"`), `isOffline()`, fetch guard (503 for
  other origins), `isMapAvailable()`.
- `src/client/mobile/OfflineGuard.ts`: mobile-only entry loaded before
  `Main.ts`; installs the guard and imports `mobile-theme.css`.
- `src/client/mobile/mobile-theme.css`: the whole visual layer, scoped to
  `body.mobile-theme`; retunes upstream Tailwind tokens and adds `wc-*`
  plates/buttons. Most upstream screens are restyled here by selector.
- Small `isMobileShell()` / `isOffline()` branches in upstream components:
  `GameModeSelector` (title screen), `ControlPanel` (economy plate + send rail,
  snapping 100/75/50/25), `GameRightSidebar` (timer, pause, pause overlay,
  Android back), `GameLeftSidebar` (land-share plate), `WinModal` (offline
  aftergame), `SinglePlayerModal` (Play-again replay), `LangSelector` (title),
  `Auth.userAuth` (offline → signed out), `LobbySocket`, `Main.ts`.
- `src/client/mobile/AppInfo.ts` (source URL, release tag rule, version),
  `About.ts`, `FatalScreen.ts` (hooked from `showErrorModal` and
  `MapRenderer.onContextUnrecoverable`), `PlayStats.ts`; release gate in
  `scripts/mobileBuild.ts`, `scripts/androidRelease.ts`.
- `src/client/mobile/MobileBack.ts` (Capacitor back button),
  `SoloReplay.ts` (Play again with the same settings), `CuratedMaps.ts`
  (15 shipped maps).
- `index.html` EJS: `locals.mobile` drops third-party scripts, adds CSP, the
  WebView-version check, and hides online UI by selector.
- Android: `capacitor.config.json` (webDir `dist-mobile`, night
  backgroundColor, `SystemBars.hidden`), `android/variables.gradle` (minSdk 26),
  manifest `sensorLandscape`, `res/drawable/wc_mark.xml` (vector mark),
  `res/drawable/splash.xml`, `res/values/styles.xml` (night splash/window).
- Strings: all new UI text uses `translateText()` with keys in the `mobile`
  block of `resources/lang/en.json` (only en.json is edited; Crowdin owns the
  rest).
- Tests: `tests/client/MobileShell.test.ts` covers the shell, guard, lifecycle
  pause, back button and send rail.

## Decisions already made (do not reopen without the owner)

- Fork + Capacitor; port first, differentiator after the playtest; no outreach
  to OpenFront maintainers (PLAN.md final gate).
- Landscape only; casual phone players are the design target; own game UI, not
  Material.
- Visual direction: the mobile strategy-game category standard at Clash of
  Clans / Clash Royale and Territorial.io / Risk mobile craft (PRODUCT.md
  Brand Commitments). The WebGL battlefield stays as upstream renders it.
- Ratio control is a right-edge vertical rail snapping 25/50/75/100 (gate d2b).
- Tap attacks immediately; long-press opens the radial menu (`9b09c29`).

## Design tooling notes

The redesign used the Impeccable skill. `.impeccable/config.json`,
`.impeccable/design.json` and `.impeccable/surfaces/src-client-mobile.md`
(direction contract) are committed; sketches, captures and question state are
gitignored. For further UI work, keep `DESIGN.md` as the authority and run the
design detector on changed CSS/TS.
