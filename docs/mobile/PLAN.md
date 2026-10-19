<!-- /autoplan restore point: "C:\\Users\\Ahmed\\AppData\\Local\\Temp\\claude\\G\u002d\u002dCode-World-Of-Conflict\\3ea34fe0-88b6-4fa2-b99c-b60c97c2fea6\\scratchpad\\.gstack\\tmp\\autoplan\\woc-autoplan-restore-20261016-023600.md" -->
## Implementation plan
# World Of Conflict — mobile adaptation of OpenFront

## Goal
A phone game (Android first, iOS later) that adapts openfront.io (browser territory-conquest RTS) and is reworked for touch and small screens.

## Decided
- Fork OpenFrontIO (TypeScript web game) into G:\Code\World Of Conflict. Do not rewrite the engine.
- Wrap the web client with Capacitor to produce the Android app (iOS from the same code later).
- First playable build: single-player vs bots, fully offline, no game server.

## Steps
1. Clone OpenFrontIO and check its license and asset terms (copyleft obligations, excluded art/branding).
2. Build the web client so a single-player game vs bots runs with no server (bundle maps and assets locally).
3. Add a Capacitor Android wrapper; build a debug APK and run it on an emulator/device.
4. Mobile UX pass: touch pan/pinch-zoom, tap-to-attack and troop-ratio control, small-screen HUD and menus, safe areas, landscape/portrait, performance on mid-range Android (frame rate, memory, battery).
5. Rebrand as World Of Conflict (name, icon, splash) to comply with OpenFront's trademark/asset terms.

## Later (not in first build)
- Online multiplayer on our own server.
- iOS build.
- Store release (Play Console listing, signing, privacy policy).

<!-- autoplan-accepted:ceo -->
- Step order: Step 2 includes (a) a build-time pre-render of the EJS `index.html` (normally rendered by `src/server/RenderHtml.ts`) into a static file with a fixed `window.BOOTSTRAP_CONFIG` (`cdnBase: ""`, empty/identity `assetManifest` since paths are local, so no ordering dependency on `scripts/buildAssetHashes.ts`, `gameEnv` prod, no turnstile/stripe/jwt keys) so the app boots with no server, and (b) map curation. The feasibility gate runs between Step 3 (Capacitor wrapper) and Step 4 (UX pass); Step 4 does not start until it passes.
- Feasibility gate: on a reference mid-range device (4 GB RAM, Snapdragon 6-series / Helio G-class, Android 11+, Android System WebView at or above the bundle's `build.target`), a debug APK runs a full single-player game on the largest map in the curated list: median ≥30 fps during mid-game, no OOM or WebView crash, map files fetched by `FetchGameMapLoader` over Capacitor's `https://localhost` scheme and delivered to the engine worker, WebGL2 context created. On failure, apply in order and re-measure after each: (1) restrict to smaller maps, (2) mobile `GraphicsOverrides`, (3) raise the device floor; if all fail, stop and report before UX work (no WebGL1/canvas fallback in this plan).
- License compliance: remove `/proprietary` from the mobile build and replace every file the client references (`OpenFront.ttf` font, logos/favicon, `sounds/effects`, `sounds/music`) with an open asset or a silent/no-file fallback; a fresh run shows no 404s or asset console errors. A build-time check fails the build if any `dist/` file's content hash matches a `proprietary/**` file. App ships an About screen crediting OpenFront (CC BY-SA attribution "OpenFront"), stating AGPL-3.0 and linking the World Of Conflict public source repo; the public source repo and a git tag matching each APK exist before ANY APK leaves the dev machine (including testers and internal Play tracks). Rebrand and About screen land in Step 2, before the first APK is shared. Step 1 also records provenance/license of map (`map.bin`, `manifest.json`) and flag data in `resources/` (expected CC BY-SA via LICENSE-ASSETS; confirm per source).
- Rebrand: app name, icon, splash and in-game title read "World Of Conflict"; no OpenFront logo or trademark used as our brand.
- Asset budget: first measure the non-map baseline APK (non-map resources ~57 MB uncompressed [measured: du]) and record it; then pick maps from one config list to keep the release AAB ≤150 MB. Minimum 8 maps, including at least 2 of the smallest maps by `map.bin` size; final list recorded in the config with each map's size. The same config filters every client map surface: `SinglePlayerModal.ts` default map (must be one of the small maps in the list; the largest map is only the perf stress test), `getRandomMapType()` in `src/client/utilities/GameConfigHelpers.ts`, `MapPicker.ts`, `MapDisplay.ts`, `MapFavorites.ts`; a test asserts every UI-selectable map has its files in `dist`. `Maps.gen.ts` (engine-api) stays untouched.
- Offline: with the device in airplane mode, a fresh install launches, starts a single-player game vs bots, plays to the win/loss and aftergame screens, and returns to the menu with no error dialogs or uncaught console errors. Under the mobile shell none of these run: `Auth.ts`, `Api.ts`/`ApiBase.ts` callers, `ServerList.ts`, `SingleplayerHeartbeat.ts`, `LocalServer` archive upload, `Cosmetics.ts`, `ProgressionApi.ts`, `ClanApi.ts`, `FriendsApi.ts`, `Matchmaking.ts`, `NewsModal.ts`, `Telemetry.ts`, `SteamLink.ts`, `AdGatekeeper.ts`, `GamePortal` SDKs, turnstile; aftergame/stats path included (`tests/AftergameSingleplayer.test.ts`). The pre-rendered mobile `index.html` contains no third-party scripts: CrazyGames SDK, Cloudflare turnstile, googletag ads, gtag/GA, Cloudflare Insights beacon, faro, Stripe (`StripeInline.ts`) are stripped. Network safety comes from ONE choke point, not per-file gates: under the mobile shell in offline mode, `MobileShell.ts` installs a `fetch`/`WebSocket`/`sendBeacon` guard that rejects any non-local origin before app code runs, so new upstream callers are covered automatically; the listed modules are additionally hidden from the UI (no account/clan/friends/store/news/ranked entry points). Verified by (0) a runtime test that drives a scripted single-player game under the guard and fails on any non-local request, (1) a unit test that the listed UI entry points are hidden under the shell, (2) a build check that `dist/index.html` has no external `src=`/`href=` to non-local origins, (3) one manual airplane-mode run.
- Mobile shell detection lives in one module (`MobileShell.ts`) mirroring `DesktopShell.ts`, covered by a unit test. It exposes a network mode (`"offline"` now; `"own-server"` reserved for the online milestone) instead of scattered `if (isMobile) return` checks, so the online milestone flips one setting. No `ClientPlatform` schema change in this offline build (deferred to the online milestone).
- App lifecycle (via new dependency `@capacitor/app`: `appStateChange` for background/foreground, `backButton` for Android back): backgrounding pauses the local game and mutes `AudioMixer`; foregrounding resumes game and audio. If Android kills the process while backgrounded, relaunch opens the main menu with no crash dialog (no save/resume, see E10). Android back: in game → close top modal, else pause via the existing `toggle_pause` path and show a new small mobile pause/quit overlay (Resume / Quit to menu); on main menu → close top modal, else a confirm-exit overlay. Both overlays are new mobile UI components using `translateText()`. Manual checklist on device.
- Graphics: after the feasibility gate, if median fps <30, add one mobile `GraphicsOverrides` set applied under the shell and re-measure; otherwise no graphics change.
- Mobile UX pass (Step 4) is iterated first on the web build (`npm run dev:host`, phone browser on LAN and Chrome device emulation), then confirmed on the device APK. Acceptance, each checked on the reference device: one-finger pan and two-finger pinch work without triggering attacks; tap on enemy/neutral territory sends an attack at the current ratio; troop-ratio control reachable with one thumb; every touch target ≥44 px; no HUD element hidden under notch/nav bar (safe-area insets applied); app locked to one orientation chosen in the design phase; battery drain over a 10-min game recorded (not gated).
- Product gate after Step 4: 5-10 people play the APK on their own phones; a written log records per player: finished a game (y/n), match length, started a second game (y/n), top complaint. Pass bar set before the playtest: ≥60% finish a game and ≥40% start a second. This gate is a precondition for starting the online milestone.
- Device floor: `minSdkVersion` 26 (Android 8); Vite `build.target` set explicitly for the mobile build and recorded as the WebView floor. A small inline classic `<script>` in the pre-rendered `index.html`, running before the module bundle, checks WebGL2 + module-worker support and the Chromium version; on failure it shows a static "Update Android System WebView" screen with a Play Store link (inline strings in the few shipped languages, not `translateText()`).
- Engine untouched: no changes under `packages/engine*`; `npm test` and `tests/LayerBoundaries.test.ts` stay green.
- Upstream sync: mobile changes confined to `MobileShell.ts`, the gated call sites listed above, `index.html` (script gating, title), the new pre-render build script, `vite.config.ts` (asset filter, proprietary exclusion), the map-curation config and the filtered map surfaces (`SinglePlayerModal.ts`, `GameConfigHelpers.ts`, `MapPicker.ts`, `MapDisplay.ts`, `MapFavorites.ts`), `package.json` (`@capacitor/*` deps), `Main.ts` (lifecycle + back-button wiring), Capacitor config + `android/`, mobile CSS, new mobile overlays (pause/quit, confirm-exit, WebView-too-old, About), rebrand assets (icon, splash, manifest), replacement assets, `resources/lang/en.json` (new strings); UPSTREAM.md documents the merge procedure.
<!-- /autoplan-accepted:ceo -->

<!-- autoplan-accepted:design -->
- Orientation: app is landscape-locked (`android:screenOrientation="sensorLandscape"`); mobile CSS baseline targets landscape ≥640x320. Replaces "app locked to one orientation chosen in the design phase".
- Gesture model under the shell: tap = <10 CSS px movement and <250 ms with one pointer that never had a second pointer → primary action (spawn/attack); drag → pan; pinch → zoom and any gesture that ever had 2 pointers never attacks; long-press 400 ms → existing radial menu. Attack stays instant on tap, with an amber ripple at the tap point; an invalid target shows a red ripple and sends nothing. Verified by unit tests on the gesture classifier (tap, slow tap, drag, pinch-with-early-lift) and the device checklist.
- HUD layout (landscape): bottom-left economy pill (troops + rate + max bar, gold); right-edge ratio control = four 48 px preset buttons 25/50/75/100 (current highlighted amber), fine slider kept in settings; top-left leaderboard button showing rank; top-center latest critical event toast; top-right timer + pause only. Fast-forward, settings and quit move into the pause overlay; fullscreen and exit are hidden under the shell; chat and keybind hints hidden. All HUD containers apply `env(safe-area-inset-*)`.
- Touch targets ≥48 CSS px with ≥8 px spacing (supersedes 44 px); HUD text ≥14 CSS px, numeric readouts ≥16 CSS px.
- Tutorial: reuse the existing tutorial steps; under the shell it renders as a top banner ≤15% of screen height (expandable), never covering the ratio control or the economy pill.
- States: map loading shows a full-screen "Loading <map>" screen; map load failure shows "Couldn't load this map" + Back to menu; WebGL context lost → attempt restore, and if not restored within 3 s show "Game can't resume" + Back to menu; Favourites empty shows "Tap ☆ on a map to save it"; maps removed by curation are filtered from favourites silently; aftergame shows "Play again" (same settings, one tap) as primary and "Menu" as secondary.
- Spawn: in landscape the spawn view fits the map height; the existing "Choose a starting location" prompt stays; re-pick is allowed until the spawn is accepted.
- Back button per screen: splash ignore; home close modal else confirm exit; solo modal close; loading ignore; spawn/in game close modal else pause overlay; pause overlay resume; aftergame → menu; About/Settings close; WebView-too-old exit app.
- Home under the shell keeps Solo, Tutorial, Settings and About with no empty gaps where online buttons were removed; About is reachable from home and settings and lists name, version + git tag, AGPL-3.0 + source link, "Contains assets from OpenFront (CC BY-SA 4.0)".
- Typography: Overpass (already in `resources/fonts`, open license) replaces `OpenFront.ttf` everywhere; the Step 4 layout pass is done with Overpass. Until the brand look is chosen, the wordmark is "World Of Conflict" in Overpass Bold on the existing dark background.
- Locales: all 42 `resources/lang` files ship; new strings go to `en.json` only and fall back to English.
- Playtest log adds per player: first moment of confusion and observed fail point (spawn / first attack / ratio / mid-game).
<!-- /autoplan-accepted:design -->

<!-- autoplan-accepted:eng -->
- Network enforcement is a CSP `<meta>` in the pre-rendered `index.html`: `default-src 'self' blob: data:; connect-src 'self' blob: data:; img-src 'self' blob: data:; script-src 'self' blob: 'sha256-<inline check script>'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'`. It replaces the monkey-patched fetch/WebSocket/sendBeacon guard as the enforcement mechanism; a `fetch` wrapper remains only as a logging/test hook that returns a synthetic 503 `Response` for non-local origins. Boot-time online callers are not invoked under the shell (gate in `Main.ts`).
- Offline verification harness: one Playwright smoke test (reusing the `.claude/skills/run-openfront` helpers) against the built mobile `dist` served locally, routing non-local hosts to failure and failing on any non-local request, `pageerror` or `unhandledrejection`, through cold start → solo → small map → spawn → aftergame → Play again; jsdom unit tests for shell detection, network mode, hidden UI, curation, lifecycle and error overlays; node tests for the build scripts.
- Prerender: the mobile `index.html` is rendered from the same EJS template `src/server/RenderHtml.ts` uses, with a mobile config (`cdnBase: ""`, identity asset manifest, no turnstile/stripe/jwt); a node test asserts every key RenderHtml sets is present in the mobile `BOOTSTRAP_CONFIG`.
- License build guard: in mobile mode a Vite `resolveId`/`load` hook throws on any path under `proprietary/`; the dist content-hash check stays as a secondary net.
- Map curation lives in one `curatedMaps()` helper imported by the SinglePlayerModal default, `getRandomMapType`, MapPicker, MapDisplay, MapFavorites, the tutorial map and Play again; a build test asserts every map reachable from those surfaces has its files in `dist`.
- Gestures reuse the existing `InputHandler` (pointer events, `DRAG_THRESHOLD_PX = 10`, pinch tap-suppression, `LONG_PRESS_MS = 800`, `pointercancel`); no second classifier and no "<250 ms" rule. The game canvas has `touch-action: none`. Tests in `tests/client` cover pinch-with-early-lift, `pointercancel` mid-tap and a drag of ≥10 px producing no attack. Supersedes the design block's "<250 ms" and "400 ms" thresholds.
- WebView capability: extend `WebGLGate.ts` with an Android WebView status; the inline pre-module script only checks ES-module support and the Chromium version against `build.target` and shows minimal static text. No separate "WebView too old" component.
- Lifecycle: track `pausedByLifecycle` separately from the user's pause and only undo what lifecycle paused; skip spawn phase, loading and aftergame; on background suspend the Web Audio `AudioContext` (not just mute) and resume it on foreground; a unit test with fake timers asserts resume emits no burst of catch-up turns.
- WebGL context loss: show "Game can't resume" + Back to menu unless the renderer already handles `webglcontextrestored`. The feasibility gate runs 10 background/foreground cycles; if any loses the context, a renderer rebuild from the current GameView becomes required work before the playtest.
- Renderer process death (`onRenderProcessGone`): verified on the gate device; if Capacitor white-screens, override it to reload to the menu.
- External links (source repo, Play Store) open in the system browser; `server.allowNavigation` is empty; `webContentsDebuggingEnabled` is false in release builds.
- Ratio presets and the settings slider read and write the one existing attack-ratio setting.
- Feasibility gate measurement: rAF frame times from minute 5 to 15 on the largest curated map via the existing performance overlay/metrics path; log median and 1%-low fps, device model, Android and WebView versions; a reverse-landscape (180°) check that safe-area insets move with the cutout.
- The asset budget uses each map's compressed size inside the built AAB, not on-disk `map.bin`.
- Build order: lanes A (build mode) and B (mobile shell) in parallel, then C (Capacitor) and D (HUD/CSS), then E (gate + playtest); edits to `Main.ts` and `index.html` are sequenced.
<!-- /autoplan-accepted:eng -->
## Review record

# Phase 1 — CEO review (SELECTIVE EXPANSION, auto-decided by /autoplan)

Repo state: fresh shallow clone of openfrontio/OpenFrontIO at `5e4b55a`, upstream release line v0.34.x. No local commits, no TODOS.md, no design doc. Outside voice provider: Antigravity (`agy` 1.3.3), substituted for Codex at the user's request.

## Step 0A — Premise table

| # | Premise | Claim | Receipt | Verdict |
|---|---|---|---|---|
| P1 | We may fork and ship OpenFront code | AGPL-3.0 code, plus Section 7 terms: keep copyright notices visible, no misrepresentation of modified versions | `LICENSE`, `LICENSING.md` (Phase 3 + Phase 5) | VALID with obligations: publish full app source, in-app notice + source link, rebrand |
| P2 | Single-player vs bots runs with no server | Sim already runs in the client via `LocalServer`; but boot path calls closed API (userAuth, server list, turnstile) and single-player fires heartbeat + archive upload | `src/client/LocalServer.ts:49`, `src/client/SingleplayerHeartbeat.ts:24-38`, `src/client/Main.ts:519-542,985` | PARTIAL: engine offline-ready, boot/menus are not. Must verify in airplane mode |
| P3 | Capacitor can host the client | Vite static build, WebGL2 renderer, engine in a Web Worker | `vite.config.ts`, `src/client/render/`, `packages/engine/src/worker/Worker.worker.ts` | UNVERIFIED: plausible on Android System WebView with WebGL2; prove on a real mid-range device |
| P4 | Touch controls must be built | Pinch-zoom, long-press, tap already implemented; mobile-width nav exists | `src/client/InputHandler.ts:288,969,1164`, `src/client/Layout.ts:11`, `src/client/Platform.ts:101` | FALSE: step 4 is refinement of existing input, not new controls |
| P5 | "Bundle maps and assets locally" fits in an app | `resources/` 672 MB, of which maps 615 MB across 135 maps, ~10.7 MB each (map.bin 8.2 MB + 4x 2.0 MB + 16x 0.5 MB) [measured: du, ls] | `resources/maps/*` | FALSE as written: exceeds Play's 200 MB base download [estimated: Play AAB limit from docs] |
| P6 | Only "excluded art/branding" needs care | Build overlays `/proprietary` (all rights reserved fonts/images/sounds) on top of `/resources` | `vite.config.ts:209-210`, `LICENSE-ASSETS` | VALID and stronger: `/proprietary` must be removed and replaced, not just rebranded |
| P7 | A phone adaptation is a differentiated product | territorial.io ships iOS app with offline bots and <5 min matches; third-party "OpenFront io" APKs exist (TapTap, open-front.fr); a community "OpenFrontMobile" port was listed but its repo now 404s | web search 2026-10-16 | CHALLENGED: differentiation not stated in plan |
| P8 | Offline-first then online later is cheap | Online needs our own `src/server` deploy + the closed API's auth/stats replaced or dropped | `CLAUDE.md` "API — Closed-source Cloudflare Worker" | VALID for sequencing; online is a separate project |

unverified=2 (P3, OpenFrontMobile status)

## Step 0B — Existing code leverage

| Sub-problem | Existing code | Plan reuse |
|---|---|---|
| Offline simulation | `LocalServer` + engine worker | Reuse as-is |
| Native-shell detection | `DesktopShell.ts` (`window.openfrontDesktop`), `ClientPlatform.ts`, `GamePortal.ts` | Mirror pattern: `MobileShell.ts` + `"android"` in `ClientPlatform` schema |
| Touch input | `InputHandler.ts` pointer/pinch/long-press | Reuse; tune thresholds, add missing gestures only where playtest shows gaps |
| Mobile layout | `Platform.isMobileWidth`, `mobile-nav-bar`, `Layout.ts` | Reuse; extend for safe areas + landscape |
| Performance tiers | `GraphicsPresets.ts`, `PerformanceOverlay.ts` | Default to low preset on mobile shell |
| Pause | `LocalServer.paused` | Wire to app background event |
| i18n | `translateText()` + `resources/lang/en.json` | All new strings go through it |
| Perf harness | `npm run perf:client*` | Use for before/after numbers |

## Step 0C — Dream state

```
  CURRENT STATE                 THIS PLAN                       12-MONTH IDEAL
  Browser-only OpenFront   ---> Offline Android APK, curated ---> World Of Conflict on Play + App Store:
  fork, 672 MB assets,          maps, rebranded, open assets       short-session modes, online lobbies on
  proprietary art overlay,      only, existing touch tuned,        our server, phone-native HUD, monthly
  desktop-first HUD             thin mobile layer over upstream    upstream merges, crash telemetry
```
Plan moves toward the ideal if the mobile layer stays thin enough to keep merging upstream.

## Step 0D — Approach
Settled by the user (AskUserQuestion, this session): fork + Capacitor, single-player vs bots first. Alternatives (TWA/PWA hosting; native rewrite) recorded as rejected by user choice. No new approach question.

## Step 0E — Mode
`Auto-decided review mode → SELECTIVE EXPANSION`. Planned changed files: ~15-25 [estimated], mostly new (`capacitor.config.ts`, `android/`, `MobileShell.ts`, map manifest filter, CSS). Override rule from /autoplan fixes the mode.

## Step 0G — HOLD checks + cherry-picks

HOLD checks:
1. Complexity: >8 files expected because `android/` is generated scaffolding; hand-written files ~8. OK.
2. Minimum change set: build-time asset filter, proprietary removal, mobile shell flag, offline boot path, Capacitor config, back-button + pause wiring. Everything else deferrable.
3. Invariants: engine determinism (`DetMath`, seeded PRNG) untouched; `tests/LayerBoundaries.test.ts` must stay green.

Cherry-pick candidates (auto-decided, see Decision Audit Trail):

| # | Proposal | Effort (human / CC) | Decision | Reason |
|---|---|---|---|---|
| E1 | Curated mobile map set (10-15 maps, ≤150 MB) selected at build time | M / S | ACCEPTED (feasibility fix) | P5: app cannot ship otherwise |
| E2 | Offline boot path: mobile shell skips auth, server list, turnstile, heartbeat, archive upload, cosmetics, ads, Steam/portal UI | M / S | ACCEPTED (feasibility fix) | P2 |
| E3 | Replace `/proprietary` with open assets; build fails if any proprietary file is bundled | S / S | ACCEPTED | P6, legal |
| E4 | Pause on app background, resume on foreground (Capacitor App plugin → `LocalServer` pause) | S / S | ACCEPTED | In blast radius, phones get interrupted |
| E5 | Android back button: close modal → open pause menu → confirm exit | S / S | ACCEPTED | Play quality baseline |
| E6 | ~~Default low graphics preset~~ → measure-then-tune: if the feasibility gate misses the fps bar, add one mobile `GraphicsOverrides` set (built-in presets are aesthetic only: default/night/evans_pick/colorblind, `src/client/render/gl/graphics-presets.json`) | S / S | ACCEPTED (revised after spec review) | No perf preset exists to reuse |
| E7 | Thin-layer rule: mobile changes live in `MobileShell.ts`, config, CSS, build filter; upstream merge procedure documented | S / S | ACCEPTED | 6-month trajectory, keeps upstream fixes flowing |
| E8 | AGPL compliance surface: in-app About with OpenFront credit, license, source link | S / S | ACCEPTED | P1 Section 7 terms |
| E9 | Short-session mode (small maps, faster default speed, ≤10 min target) as the phone differentiator | M / S | TASTE → DEFERRED to TODOS | P7; needs playtest data first |
| E10 | Persistent save/resume across app kill (engine snapshots) | L / M | TASTE → DEFERRED to TODOS | Pause covers most interruptions |
| E11 | Haptics on tap/attack | S / S | TASTE → DEFERRED to TODOS | New native dependency, polish |
| E12 | On-demand map downloads (Play Asset Delivery or HTTP) beyond curated set | L / M | DEFERRED to TODOS | Needs hosting; outside first build |
| E13 | Local crash/error log + opt-in reporting | M / S | DEFERRED to TODOS | Needs privacy policy + service |

## Step 0I — Temporal interrogation

```
HOUR 1 (foundations):  npm run inst; build without /proprietary; confirm vite build output runs from file:// or Capacitor's https://localhost scheme.
HOUR 2-3 (core):       mobile shell flag; offline boot path; curated map filter; single-player start from a stripped menu.
HOUR 4-5 (integration): Capacitor android/ project, WebView WebGL2 + module worker check, back button, pause; debug APK on emulator + real device.
HOUR 6+ (polish/tests): perf numbers on a mid-range phone, HUD fit, About/licensing screen, rebrand assets, unit tests for shell + filter.
Effort: human ~2-3 weeks / CC ~1-2 days of sessions [estimated].
Feasibility blockers: P3 (WebView WebGL2/worker) must be proven in hour 4 before UX work.
```

<!-- autoplan-accepted:ceo -->
- Step order: Step 2 includes (a) a build-time pre-render of the EJS `index.html` (normally rendered by `src/server/RenderHtml.ts`) into a static file with a fixed `window.BOOTSTRAP_CONFIG` (`cdnBase: ""`, empty/identity `assetManifest` since paths are local, so no ordering dependency on `scripts/buildAssetHashes.ts`, `gameEnv` prod, no turnstile/stripe/jwt keys) so the app boots with no server, and (b) map curation. The feasibility gate runs between Step 3 (Capacitor wrapper) and Step 4 (UX pass); Step 4 does not start until it passes.
- Feasibility gate: on a reference mid-range device (4 GB RAM, Snapdragon 6-series / Helio G-class, Android 11+, Android System WebView at or above the bundle's `build.target`), a debug APK runs a full single-player game on the largest map in the curated list: median ≥30 fps during mid-game, no OOM or WebView crash, map files fetched by `FetchGameMapLoader` over Capacitor's `https://localhost` scheme and delivered to the engine worker, WebGL2 context created. On failure, apply in order and re-measure after each: (1) restrict to smaller maps, (2) mobile `GraphicsOverrides`, (3) raise the device floor; if all fail, stop and report before UX work (no WebGL1/canvas fallback in this plan).
- License compliance: remove `/proprietary` from the mobile build and replace every file the client references (`OpenFront.ttf` font, logos/favicon, `sounds/effects`, `sounds/music`) with an open asset or a silent/no-file fallback; a fresh run shows no 404s or asset console errors. A build-time check fails the build if any `dist/` file's content hash matches a `proprietary/**` file. App ships an About screen crediting OpenFront (CC BY-SA attribution "OpenFront"), stating AGPL-3.0 and linking the World Of Conflict public source repo; the public source repo and a git tag matching each APK exist before ANY APK leaves the dev machine (including testers and internal Play tracks). Rebrand and About screen land in Step 2, before the first APK is shared. Step 1 also records provenance/license of map (`map.bin`, `manifest.json`) and flag data in `resources/` (expected CC BY-SA via LICENSE-ASSETS; confirm per source).
- Rebrand: app name, icon, splash and in-game title read "World Of Conflict"; no OpenFront logo or trademark used as our brand.
- Asset budget: first measure the non-map baseline APK (non-map resources ~57 MB uncompressed [measured: du]) and record it; then pick maps from one config list to keep the release AAB ≤150 MB. Minimum 8 maps, including at least 2 of the smallest maps by `map.bin` size; final list recorded in the config with each map's size. The same config filters every client map surface: `SinglePlayerModal.ts` default map (must be one of the small maps in the list; the largest map is only the perf stress test), `getRandomMapType()` in `src/client/utilities/GameConfigHelpers.ts`, `MapPicker.ts`, `MapDisplay.ts`, `MapFavorites.ts`; a test asserts every UI-selectable map has its files in `dist`. `Maps.gen.ts` (engine-api) stays untouched.
- Offline: with the device in airplane mode, a fresh install launches, starts a single-player game vs bots, plays to the win/loss and aftergame screens, and returns to the menu with no error dialogs or uncaught console errors. Under the mobile shell none of these run: `Auth.ts`, `Api.ts`/`ApiBase.ts` callers, `ServerList.ts`, `SingleplayerHeartbeat.ts`, `LocalServer` archive upload, `Cosmetics.ts`, `ProgressionApi.ts`, `ClanApi.ts`, `FriendsApi.ts`, `Matchmaking.ts`, `NewsModal.ts`, `Telemetry.ts`, `SteamLink.ts`, `AdGatekeeper.ts`, `GamePortal` SDKs, turnstile; aftergame/stats path included (`tests/AftergameSingleplayer.test.ts`). The pre-rendered mobile `index.html` contains no third-party scripts: CrazyGames SDK, Cloudflare turnstile, googletag ads, gtag/GA, Cloudflare Insights beacon, faro, Stripe (`StripeInline.ts`) are stripped. Network safety comes from ONE choke point, not per-file gates: under the mobile shell in offline mode, `MobileShell.ts` installs a `fetch`/`WebSocket`/`sendBeacon` guard that rejects any non-local origin before app code runs, so new upstream callers are covered automatically; the listed modules are additionally hidden from the UI (no account/clan/friends/store/news/ranked entry points). Verified by (0) a runtime test that drives a scripted single-player game under the guard and fails on any non-local request, (1) a unit test that the listed UI entry points are hidden under the shell, (2) a build check that `dist/index.html` has no external `src=`/`href=` to non-local origins, (3) one manual airplane-mode run.
- Mobile shell detection lives in one module (`MobileShell.ts`) mirroring `DesktopShell.ts`, covered by a unit test. It exposes a network mode (`"offline"` now; `"own-server"` reserved for the online milestone) instead of scattered `if (isMobile) return` checks, so the online milestone flips one setting. No `ClientPlatform` schema change in this offline build (deferred to the online milestone).
- App lifecycle (via new dependency `@capacitor/app`: `appStateChange` for background/foreground, `backButton` for Android back): backgrounding pauses the local game and mutes `AudioMixer`; foregrounding resumes game and audio. If Android kills the process while backgrounded, relaunch opens the main menu with no crash dialog (no save/resume, see E10). Android back: in game → close top modal, else pause via the existing `toggle_pause` path and show a new small mobile pause/quit overlay (Resume / Quit to menu); on main menu → close top modal, else a confirm-exit overlay. Both overlays are new mobile UI components using `translateText()`. Manual checklist on device.
- Graphics: after the feasibility gate, if median fps <30, add one mobile `GraphicsOverrides` set applied under the shell and re-measure; otherwise no graphics change.
- Mobile UX pass (Step 4) is iterated first on the web build (`npm run dev:host`, phone browser on LAN and Chrome device emulation), then confirmed on the device APK. Acceptance, each checked on the reference device: one-finger pan and two-finger pinch work without triggering attacks; tap on enemy/neutral territory sends an attack at the current ratio; troop-ratio control reachable with one thumb; every touch target ≥44 px; no HUD element hidden under notch/nav bar (safe-area insets applied); app locked to one orientation chosen in the design phase; battery drain over a 10-min game recorded (not gated).
- Product gate after Step 4: 5-10 people play the APK on their own phones; a written log records per player: finished a game (y/n), match length, started a second game (y/n), top complaint. Pass bar set before the playtest: ≥60% finish a game and ≥40% start a second. This gate is a precondition for starting the online milestone.
- Device floor: `minSdkVersion` 26 (Android 8); Vite `build.target` set explicitly for the mobile build and recorded as the WebView floor. A small inline classic `<script>` in the pre-rendered `index.html`, running before the module bundle, checks WebGL2 + module-worker support and the Chromium version; on failure it shows a static "Update Android System WebView" screen with a Play Store link (inline strings in the few shipped languages, not `translateText()`).
- Engine untouched: no changes under `packages/engine*`; `npm test` and `tests/LayerBoundaries.test.ts` stay green.
- Upstream sync: mobile changes confined to `MobileShell.ts`, the gated call sites listed above, `index.html` (script gating, title), the new pre-render build script, `vite.config.ts` (asset filter, proprietary exclusion), the map-curation config and the filtered map surfaces (`SinglePlayerModal.ts`, `GameConfigHelpers.ts`, `MapPicker.ts`, `MapDisplay.ts`, `MapFavorites.ts`), `package.json` (`@capacitor/*` deps), `Main.ts` (lifecycle + back-button wiring), Capacitor config + `android/`, mobile CSS, new mobile overlays (pause/quit, confirm-exit, WebView-too-old, About), rebrand assets (icon, splash, manifest), replacement assets, `resources/lang/en.json` (new strings); UPSTREAM.md documents the merge procedure.
<!-- /autoplan-accepted:ceo -->

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|----------|
| 1 | CEO | Mode SELECTIVE EXPANSION | Mechanical | override | /autoplan fixes the mode | other modes |
| 2 | CEO | Keep fork + Capacitor approach | Mechanical | P6 | User decided this session | TWA/PWA, native rewrite |
| 3 | CEO | E1 curated map set | Mechanical | P1 | 615 MB maps cannot ship | bundle all maps |
| 4 | CEO | E2 offline boot path | Mechanical | P1 | Boot calls closed API | rely on silent fetch failures |
| 5 | CEO | E3 remove /proprietary + build check | Mechanical | P1 | All-rights-reserved assets | rebrand only |
| 6 | CEO | E4 pause on background | Mechanical | P2 | S effort, reuses LocalServer pause | none |
| 7 | CEO | E5 Android back button | Mechanical | P2 | Play baseline | default exit |
| 8 | CEO | E6 low preset default | Mechanical | P4 | Reuses GraphicsPresets | new perf system |
| 9 | CEO | E7 thin-layer rule + UPSTREAM.md | Mechanical | P5 | Keeps upstream merges cheap | deep fork |
| 10 | CEO | E8 About/licensing screen | Mechanical | P1 | AGPL §7 terms | none |
| 11 | CEO | E9 short-session mode deferred | Taste | P3 | Needs playtest data | include now |
| 12 | CEO | E10 save/resume deferred | Taste | P3 | Pause covers common case | include now |
| 13 | CEO | E11 haptics deferred | Taste | P5 | New dependency for polish | include now |
| 14 | CEO | E12 on-demand maps deferred | Mechanical | P3 | Needs hosting | include now |
| 15 | CEO | E13 crash reporting deferred | Mechanical | P3 | Needs privacy policy/service | include now |
| 16 | CEO | Accept all 18 spec-review fixes (iteration 1) | Mechanical | P1 | In blast radius, make requirements testable | leave vague |
| 17 | CEO | E6 revised to measure-then-tune | Mechanical | P5 | No perf preset exists | invent preset tiers |
| 18 | CEO | Reference device = 4 GB / SD 6-series class, ≥30 fps median | Taste | P1 | Typical mid-range target; user may pick other device | 60 fps bar |
| 19 | CEO | ~~Keep `"android"` ClientPlatform value~~ superseded by #23 | Taste | P5 | — | — |
| 20 | CEO | Accept spec-review iteration 2 fixes (static pre-render, 3rd-party script strip, overlays, device floor, allow-list) | Mechanical | P1 | Boot blocker + privacy | ship trackers / server render |
| 21 | CEO | Back button uses new minimal overlays, not window.confirm | Taste | P5 | Native confirm() looks broken in a game | window.confirm |
| 22 | CEO | minSdk 26 + WebView-too-old screen | Taste | P1 | Capacitor 6+ default floor; clear failure | higher floor |
| 23 | CEO | Defer `"android"` ClientPlatform value to online milestone | Mechanical | P5 | No effect offline; one less upstream diff | keep now |
| 24 | CEO | Accept spec iteration 3 fixes (map surfaces filtered, @capacitor/app named, inline pre-bundle WebView check, explicit build.target, identity asset manifest, gate wording) | Mechanical | P1 | Implementer would hit each | leave |
| 25 | CEO | F5 single network choke point (fetch/WebSocket/beacon guard) + runtime no-egress test | Mechanical | P4/P5 | One guard where all callers route; covers future upstream callers | per-file gates only |
| 26 | CEO | F7 MobileShell network mode (offline/own-server) | Mechanical | P5 | Same work, no dead-end for online | boolean isMobile |
| 27 | CEO | F4 rebrand + About before first shared APK; F3 source tag per APK, map/flag provenance | Mechanical | P1 | Legal exposure from tester builds | rebrand last |
| 28 | CEO | F2 default single-player map = small map | Mechanical | P1 | Phone sessions are short | largest map default |
| 29 | CEO | F8 iterate UX on web build first, confirm on APK | Mechanical | P3 | Faster loop, same code | APK-only loop |
| 30 | CEO | F10 pre-decided perf fallback order | Mechanical | P6 | Gate failure → decision, not stall | stop only |
| 31 | CEO | F1 playtest/retention gate after Step 4 (manual log, preset bar) | Mechanical | P1 | Both voices: bots-only build does not prove demand | no product gate |
| 32 | CEO | F6 local exportable crash log: keep deferred (E13) | Taste | P3 | Both voices flag blindness; playtest log + Play vitals cover first track | add now (M effort) |
| 33 | CEO | agy: rename for searchability | Taste | P6 | Name is the user's call; flag at gate | — |
| 34 | CEO | agy: Capacitor WebView is a dead end | Taste | P6 | Claude voice disagrees; feasibility gate measures it | switch engine |
| 35 | CEO | Partner with / contribute upstream to OpenFront before forking deeply | USER CHALLENGE | — | Both voices recommend; changes user's fork-first direction | — |
| 36 | CEO | Differentiation beyond "OpenFront on a phone" (short-session design, own community) | USER CHALLENGE | — | Both voices: AGPL = no moat; E9 deferred | — |
| 37 | Design | Landscape-locked | Mechanical | P1 | Both voices + live evidence (portrait map strip ~20%) | portrait |
| 38 | Design | Gesture classifier thresholds + multi-touch lockout | Mechanical | P5 | Both voices; prevents accidental attacks | unspecified |
| 39 | Design | Instant attack + ripple feedback | Taste | P3 | Current behavior; speed vs bots; revisit after playtest | select-then-confirm |
| 40 | Design | Ratio presets 25/50/75/100 right edge | Taste | P5 | Voices disagree on form; discrete beats 16px slider | vertical snapping slider |
| 41 | Design | HUD priority + anchors, trim top strip | Mechanical | P5 | Both voices | shrink desktop HUD |
| 42 | Design | Reuse existing tutorial as compact top banner | Mechanical | P4 | DRY vs new 3-card onboarding | new onboarding |
| 43 | Design | States: loading, map error, context lost, empty favourites, Play again | Mechanical | P1 | Both voices | leave to implementer |
| 44 | Design | 48 px targets, ≥14 px text | Mechanical | P1 | Android Material guidance | 44 px |
| 45 | Design | Overpass replaces OpenFront.ttf | Mechanical | P4 | Already in repo, open | new font |
| 46 | Design | Back behavior per screen | Mechanical | P1 | Claude voice H5 | partial |
| 47 | Design | Ship all 42 locales, English fallback | Mechanical | P3 | Assets already CC BY-SA | limit locales |
| 48 | Design | Brand look (logo/splash/colors) | Taste | P6 | User's call; placeholder wordmark until then | — |
| 49 | Design | DESIGN.md after playtest; haptics stays deferred | Mechanical | P3 | Not needed for first build | now |
| 50 | Eng | CSP meta as enforcement; fetch wrapper = test hook (503 Response) | Mechanical | P5 | Platform feature covers XHR/img/worker | JS-only guard |
| 51 | Eng | Don't invoke boot-time online callers; fail test on unhandledrejection | Mechanical | P1 | No-console-errors acceptance | rejected promises |
| 52 | Eng | Prerender from RenderHtml template + key test | Mechanical | P5 | Upstream drift | static copy |
| 53 | Eng | Renderer process death check on device | Mechanical | P1 | 4 GB devices | ignore |
| 54 | Eng | External links → system browser; release debugging off | Mechanical | P1 | WebView navigation/security | default |
| 55 | Eng | Extend WebGLGate instead of new screen | Mechanical | P4 | DRY | new component |
| 56 | Eng | One curatedMaps() helper | Mechanical | P4 | 7 call sites | per-file filters |
| 57 | Eng | Reuse InputHandler thresholds (10 px, 800 ms); drop 250/400 ms | Mechanical | P4 | Already implemented; supersedes design #38 thresholds | new classifier |
| 58 | Eng | One ratio setting for presets + slider | Mechanical | P5 | Single source of truth | two values |
| 59 | Eng | Vite hook throws on proprietary/ | Mechanical | P1 | Hash check misses inlined assets | hash only |
| 60 | Eng | Context loss → can't-resume unless restore exists; gate measures frequency | Taste | P5 | Both voices; rebuild only if needed | full rebuild now |
| 61 | Eng | Playwright smoke vs dist + jsdom/node units | Mechanical | P1 | jsdom lacks WebGL/worker | jsdom only |
| 62 | Eng | fps measurement method defined | Mechanical | P1 | Reproducible gate | unspecified |
| 63 | Eng | Budget by compressed AAB size | Mechanical | P1 | Accurate | on-disk size |
| 64 | Eng | CSP worker-src blob:; gate verifies worker spawn | Mechanical | P1 | Antigravity critical | none |
| 65 | Eng | Suspend AudioContext; no tick-burst test | Mechanical | P1 | Battery + state | mute only |
| 66 | Eng | Reject .bin MIME concern | Mechanical | P5 | arrayBuffer ignores Content-Type | add MIME map |
| 67 | Eng | Reverse-landscape inset check | Mechanical | P1 | sensorLandscape flips cutout | static insets |

## CEO Dual Voices

Claude subagent (INPUT ceo c0046be0…, completed) and Antigravity `agy` 1.3.3 (outside voice; attempt 1 produced no output because headless mode denied a shell command; attempt 2 completed with `--mode plan --sandbox`). Codex not used (user asked for Antigravity).

```
CEO DUAL VOICES — CONSENSUS TABLE:
  Dimension                             Claude     Antigravity  Consensus
  1. Premises valid?                    partial    no           CONFIRMED concern (fun/retention, moat assumed)
  2. Right problem to solve?            port≠game  no           CONFIRMED concern
  3. Scope calibration correct?         add gate   overbuilt    CONFIRMED concern (different fixes)
  4. Alternatives sufficiently explored? no        no           CONFIRMED (partnership; PWA-first vs Godot differ)
  5. Competitive/market risks covered?  no         no           CONFIRMED
  6. 6-month trajectory sound?          drift      drift        CONFIRMED (fork maintenance)
```
Single-voice items: Antigravity "rename for searchability" and "Capacitor is a dead end" (Claude disagrees on the second) → taste decisions #33, #34.

## CEO Review Sections

### Section 1 — Architecture
Current scope: mode SELECTIVE EXPANSION; accepted E1-E8 (E6 revised), F1-F5, F7, F8, F10; deferred E9-E13 and the `ClientPlatform` value; user challenges UC1 (partnership/upstream) and UC2 (differentiation) pending at the final gate.

```
 Android app (Capacitor, minSdk 26)
 +------------------------------------------------------------------+
 | System WebView  https://localhost                                |
 |  index.html (pre-rendered, static BOOTSTRAP_CONFIG,              |
 |   inline WebView/WebGL2 check --fail--> "Update WebView" screen) |
 |     |                                                            |
 |     v                                                            |
 |  MobileShell.ts -- network mode "offline" -- fetch/WS/beacon     |
 |     |               guard (rejects non-local origins)            |
 |     +- hides account/clan/store/news/ranked UI                   |
 |     +- @capacitor/app: appStateChange -> pause+mute; backButton  |
 |     v                                                            |
 |  Main.ts -> SinglePlayerModal (curated maps) -> ClientGameRunner |
 |     |                         |                                  |
 |     v                         v                                  |
 |  LocalServer (turns)    FetchGameMapLoader --fetch--> /maps/<curated>/
 |     |                         | (files passed in worker init)    |
 |     v                         v                                  |
 |  Engine Web Worker (UNCHANGED packages/engine*)                  |
 |     | GameUpdates                                                |
 |     v                                                            |
 |  WebGL2 renderer + Lit HUD (mobile CSS, safe areas)              |
 +------------------------------------------------------------------+
 Build: vite build (explicit build.target, proprietary excluded,
        map filter) -> pre-render index.html -> proprietary-hash check
        -> no-external-src check -> cap sync -> gradle assemble
```
Data flow (start game): happy = curated map fetched, worker init, play. Nil = map config empty → build fails (config must list ≥8). Empty = map file 0 bytes/missing → `FetchGameMapLoader` rejects; must surface a translated error and return to menu (GAP → eng phase). Error = WebView OOM mid-game → process dies → relaunch to menu (accepted).
State: `foreground ⇄ background(paused, muted)`; `background → killed → cold start(menu)`; invalid transition "resume into game after kill" prevented by having no save state.
Coupling: new `MobileShell` ← Main.ts, index.html; no engine coupling. Single points of failure: WebView version; curated-map config. Security: no new endpoints; attack surface shrinks. Rollback: previous tagged APK; later, Play tracks.
Findings: F5 choke point (#25), F7 mode config (#26). Value test: UPSTREAM.md is consumed by every upstream merge (keep).

### Section 2 — Error & Rescue Map
```
 CODEPATH                         | WHAT CAN GO WRONG                 | CLASS
 ---------------------------------|-----------------------------------|-------------------
 inline WebView check             | no WebGL2 / no module worker      | capability-missing
 FetchGameMapLoader (curated map) | 404 / truncated file              | fetch reject/parse
 Engine worker init               | OOM, worker spawn blocked         | worker error
 MobileShell network guard        | upstream code calls remote origin | GuardRejection
 Replacement assets               | missing font/sound                | 404/decode error
 appStateChange/backButton        | plugin absent (web build)         | undefined plugin
 LocalServer end of game          | archive/aftergame tries network   | GuardRejection

 CLASS              | RESCUED?   | RESCUE ACTION                        | USER SEES
 -------------------|------------|--------------------------------------|-------------------------
 capability-missing | Y          | static update-WebView screen         | message + Play link
 map fetch/parse    | N <- GAP   | catch in loader caller, back to menu | translated "map failed" (eng)
 worker error/OOM   | partial    | process death -> relaunch to menu    | menu, game lost
 GuardRejection     | Y          | reject promise; console.warn once    | nothing (feature hidden)
 asset 404          | Y          | build check + silent fallback        | nothing
 plugin undefined   | Y          | MobileShell no-ops off-device        | nothing
```

### Section 3 — Security & Threat Model
Attack surface shrinks: no auth, API, ads or third-party scripts. Threats: (1) tampered APK under our name, Med/Med, mitigated later by Play signing; (2) an in-app link (help/about/news) navigates the WebView to a remote page: the guard blocks fetch but not navigation, Low/Med, eng phase: open external links in the system browser; (3) secrets: none shipped (turnstile/stripe/jwt removed); (4) new deps `@capacitor/core`, `@capacitor/android`, `@capacitor/app`, maintained by Ionic. No PII collected; Play still needs a privacy policy.

### Section 4 — Data Flow & Interaction Edge Cases
```
 tap Play -> SinglePlayerModal -> map curated? -no-> impossible (UI filtered; test asserts)
                                     | yes
                                     v
                             fetch map files -fail-> GAP (Section 2)
                                     v
                              worker init -OOM-> process death -> menu
                                     v
                              play -background-> pause+mute -foreground-> resume
                                     v
                              win/loss -> aftergame (no network) -> menu
```
| Interaction | Edge case | Handled? | How |
|---|---|---|---|
| Play button | double tap | unknown | eng: confirm start is guarded |
| Back button | pressed during loading | GAP | eng: ignore until game ready |
| Background | during map load | partial | pause applies once LocalServer exists |
| Pinch | during spawn selection | existing | `InputHandler` suppresses taps mid-pinch |
| Rotate | orientation | Y | locked (design phase picks) |
Async ordering: background event can arrive before `LocalServer` exists → eng to specify: shell stores a pending pause and applies it on start.

### Section 5 — Code Quality
Fits existing patterns (`DesktopShell` precedent, `GamePortal` no-op style). A network-mode enum with one used value is acceptable because it replaces scattered checks (#26). UI hide list lives in one place in `MobileShell.ts`. No duplication found.

### Section 6 — Tests
| New thing | Type | Happy | Failure | Edge |
|---|---|---|---|---|
| MobileShell detection + mode | unit | shell present → offline | absent → web | malformed bridge |
| Network guard | unit (jsdom) | local fetch passes | remote fetch rejected | WebSocket, sendBeacon |
| Scripted offline game | integration | game ends, zero remote requests | — | aftergame path |
| Curated map filter | unit + build | every selectable map in dist | config lists missing map → fail | random map in list |
| Proprietary hash check | build-script test | clean dist passes | planted file fails | renamed/hashed file caught |
| No-external-src check | build-script test | clean | injected remote script fails | remote stylesheet href |
| Lifecycle/back | manual checklist | — | — | back during load |
2am-Friday test: airplane-mode full game on the reference device. Hostile QA: spam back + background during map load. Chaos: kill the WebView mid-game.

### Section 7 — Performance
Main risk is the WebView (feasibility gate). Memory: largest curated map.bin ≈ 8 MB plus 4x/16x, worker and textures, measured in the gate. Slow paths: cold-start map load (target <5 s, measure), first shader compile, late-game updates (median ≥30 fps; also record 1%-low fps, not gated).

### Section 8 — Observability
No telemetry by design. Day-1 visibility: playtest log (F1), `PerformanceOverlay` for testers, Play Console vitals on a closed track. Gap: no crash reports from sideloaded testers (E13 deferred, taste #32).

### Section 9 — Deployment & Rollout
No server or migrations. Debug APK → tagged release APK to testers (source tag first) → Play internal track (needs privacy policy + signing). Rollback: previous tagged APK. Post-build checklist: size ≤150 MB, proprietary check, no-external-src check, airplane-mode smoke.

### Section 10 — Long-term trajectory
Debt: fork drift (thin layer + choke point + UPSTREAM.md), manual lifecycle tests. Reversibility 4/5 (the brand name is the stickiest choice). Phase 2: online via `own-server` mode. Phase 3: iOS (AGPL vs App Store terms: research first).

### Section 11 — Design & UX
Flow: `splash → home (Play, Settings, About) → map pick → loading → game ⇄ pause overlay → aftergame → home`.
| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Home | splash | n/a | WebView too old | menu | n/a |
| Map pick | thumbnails | n/a (≥8 maps) | missing thumbnail → placeholder | selected | n/a |
| Game | map load | n/a | map load fail (GAP) | playing | paused |
| Aftergame | n/a | n/a | n/a | win/loss | n/a |
Risk: desktop HUD density on a phone. Orientation undecided → Phase 2 design review. Touch targets ≥44 px accepted.

## NOT in scope
Deferred: E9 short-session mode, E10 save/resume, E11 haptics, E12 on-demand maps, E13 crash log, `"android"` ClientPlatform value, online multiplayer, iOS, store listing. Rejected: WebGL1/canvas fallback, native rewrite (user's choice), TWA as the first build (user's choice).

## What already exists
`LocalServer` (offline turns, pause), engine worker, `InputHandler` touch (pinch, long-press, tap), `Platform.isMobileWidth` + `mobile-nav-bar`, `DesktopShell`/`GamePortal` pattern, `GraphicsOverrides`, `FetchGameMapLoader`, `AudioMixer`, `translateText`, `npm run perf:client*`, `tests/util/Setup.ts`.

## Dream state delta
After this plan: an offline, rebranded, legally clean Android build with tuned touch, measured perf and a playtest verdict. Still missing vs the 12-month ideal: a reason to pick it over territorial.io (short-session design), online play, iOS, crash telemetry, store presence.

## Failure Modes Registry
```
 CODEPATH         | FAILURE MODE         | RESCUED?    | TEST?  | USER SEES?         | LOGGED?
 -----------------|----------------------|-------------|--------|--------------------|--------
 WebView check    | old WebView          | Y           | manual | update screen      | n/a
 map load         | missing/corrupt file | N           | N      | Silent hang?       | N   <- CRITICAL GAP (eng)
 worker           | OOM                  | Y(relaunch) | manual | menu after relaunch| N
 network guard    | upstream remote call | Y           | Y      | nothing            | warn
 proprietary leak | file bundled         | Y(build)    | Y      | n/a                | build log
 back during load | undefined            | N           | N      | unknown            | N   <- GAP (eng)
 external link    | opens in WebView     | N           | N      | stuck page         | N   <- GAP (eng)
```

## CEO Completion Summary
```
  +====================================================================+
  |            MEGA PLAN REVIEW — COMPLETION SUMMARY                   |
  +====================================================================+
  | Mode selected        | SELECTIVE EXPANSION                         |
  | System Audit         | EJS index.html needs pre-render; 615 MB maps|
  |                      | touch exists; presets are aesthetic only    |
  | Step 0               | 8 premises, 13 cherry-picks (8 acc, 5 def)  |
  | Section 1  (Arch)    | 2 issues found                              |
  | Section 2  (Errors)  | 7 error paths mapped, 1 GAP                 |
  | Section 3  (Security)| 2 issues found, 0 High severity             |
  | Section 4  (Data/UX) | 5 edge cases mapped, 2 unhandled            |
  | Section 5  (Quality) | 0 issues found                              |
  | Section 6  (Tests)   | Diagram produced, 0 gaps (eng owns 3)       |
  | Section 7  (Perf)    | 1 issue found                               |
  | Section 8  (Observ)  | 1 gap found                                 |
  | Section 9  (Deploy)  | 2 risks flagged                             |
  | Section 10 (Future)  | Reversibility: 4/5, debt items: 2           |
  | Section 11 (Design)  | 2 issues                                    |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (12 items)                          |
  | What already exists  | written                                     |
  | Dream state delta    | written                                     |
  | Error/rescue registry| 7 rows, 1 CRITICAL GAP                      |
  | Failure modes        | 7 total, 1 CRITICAL GAP                     |
  | TODOS.md updates     | 6 items proposed (final gate)               |
  | Scope proposals      | 13 proposed, 8 accepted                     |
  | CEO plan             | written                                     |
  | Outside voice        | antigravity: completed (attempt 2)          |
  | Lake Score           | N/A                                         |
  | Diagrams produced    | 4 (architecture, data flow, state, error)   |
  | Stale diagrams found | 0                                           |
  | Unresolved decisions | 2 user challenges (final gate)              |
  | Reality rows         | 7/7 rows                                    |
  +====================================================================+
```

REALITY: premise-table finding 8 premises, 3 false/partial (P2,P4,P5), unverified=2 LICENSE:1
REALITY: already-done pass fresh clone 5e4b55a, no prior mobile work in repo src/client/DesktopShell.ts:1
REALITY: surface-check finding npm scripts verified (dev:host, perf:client, build-prod); EJS index.html not static package.json:12
REALITY: binding-decisions pass user chose fork+Capacitor and bots-first this session; no prior gstack decisions CLAUDE.md:1
REALITY: numbers pass 672 MB resources, 615 MB maps, ~57 MB non-map [measured: du]; 200 MB Play limit [estimated] resources/maps/madagascar/map.bin:1
REALITY: deferred-asks pass no linked issue; user's own asks left out are online multiplayer + iOS + store release, each listed under Later with reason CLAUDE.md:1
REALITY: pr-count pass no .gstack/ship-policy.json, default one PR per wave; first build lands as one branch in the user's own fork vite.config.ts:209


# Phase 2 — Design review (auto-decided by /autoplan)

Scope gate: /autoplan — reviewing the World Of Conflict mobile plan (this active plan).
System audit: no DESIGN.md (gap; existing design vocabulary = Lit + Tailwind 4 components, dark translucent panels, Overpass font in `resources/fonts`, `OpenFront.ttf` proprietary). UI scope: home, solo modal, in-game HUD, overlays, aftergame.
Live evidence (dev build in the browser pane, 2026-10-16): portrait 360x780 home already has a mobile layout; in-game portrait shows the world map as a ~20%-height strip during spawn; bottom HUD bar text ~11 px, ratio slider thumb ~16 px; top-right strip of six ~20 px icons (timer, fast-forward, pause, settings, fullscreen, exit); landscape 780x360 gives the map most of the screen but the 22-step tutorial card covers ~35% of height; tap on neutral/enemy land attacks immediately; long-press opens the radial menu (`InputHandler.ts` `TouchLongPressStartEvent`).
Mockups: gstack designer installed but `No OpenAI API key found` → treated as DESIGN_NOT_AVAILABLE; text-only review.

## Step 0 — Design completeness
Initial rating 3/10: the plan specifies engineering checks (44 px, safe areas) but no screens, HUD priority, gesture model, orientation or states. A 10 names orientation, HUD anchors per element, the gesture table, every state of every screen, back behavior per screen, typography and the ratio control.

## Design Dual Voices

CLAUDE SUBAGENT (design — independent review): INPUT design dd3c7046…, completed; 3 critical (orientation unowned, touch model incomplete, spawn UI unspecified), 5 high (HUD hierarchy, ratio control, main menu/first run, missing states incl. WebGL context loss, back per screen), 8 medium (48 dp targets, ≥14 px text, font/brand, About entry, locales, tap feedback, keyboard hints, playtest fail point).
ANTIGRAVITY SAYS (design — UX challenge): completed; critical: orientation deferred (lock landscape), gesture slop/pinch lockout; high: hierarchy serves desktop DOM (fullscreen/exit redundant), states missing (loading, favourites empty, attack feedback, context loss), ratio slider unusable (use discrete pills), tutorial blocks the map; medium: no type minimum, no color-blind spec.

```
DESIGN OUTSIDE VOICES — LITMUS SCORECARD (APP UI classification):
  Check                                   Claude     Antigravity  Consensus
  1. Brand unmistakable in first screen?  NO (TBD)   NOT SPEC'D   CONFIRMED gap (rebrand undefined)
  2. One strong visual anchor?            YES (map)  YES (map)    CONFIRMED
  3. Scannable by headlines only?         NO         NO           CONFIRMED (HUD unranked)
  4. Each section has one job?            NO         NO           CONFIRMED (top strip 6 jobs)
  5. Cards actually necessary?            n/a        NO (tutorial card) CONFIRMED (tutorial too big)
  6. Motion improves hierarchy?           NOT SPEC'D (tap feedback) NOT SPEC'D CONFIRMED gap
  7. Premium without decorative shadows?  NOT SPEC'D NOT SPEC'D   NOT SPEC'D
  Hard rejections triggered:              none       none         none
```
Disagreements → taste: ratio control form (Claude: vertical snapping slider right edge; Antigravity: discrete pills); instant attack vs select-then-confirm (Claude offered both; Antigravity assumes instant).

## Pass 1 — Information Architecture: 3/10 → 9/10
Decided (auto, P5): landscape HUD priority and anchors:
```
 +----------------------------------------------------------------------+
 | [≡ #4/50]                [event toast: "Latvia attacks you"] [00:37 ⏸] |  top: leaderboard btn (L), toast (C), timer+pause (R)
 |                                                                      |
 |                         MAP (full bleed)                     [100%]  |
 |                                                              [ 75%]  |  right edge: ratio presets
 |                                                              [ 50%]  |  (48x48 each, current = amber)
 |                                                              [ 25%]  |
 | [troops 11.8K +389/s ▮▮▮▯ 17.0K | gold 37.1K]   [attack rows ✕]       |  bottom-left: economy pill; attack rows above it
 +----------------------------------------------------------------------+
   safe-area insets applied on all four edges (camera cutout side, gesture bar)
```
1. Always visible: troops (+rate, vs max), gold, ratio control. 2. Compact: timer + pause, latest critical event toast. 3. Behind a tap: leaderboard, event log, settings (from pause overlay). 4. Hidden under shell: chat, keybind hints, fullscreen, exit (Android back covers exit), multiplayer/emoji targets not used vs bots stay in radial menu.
Remaining gap: none for IA; visual polish via /design-review after build.

## Pass 2 — Interaction States: 2/10 → 9/10
```
 FEATURE      | LOADING                         | EMPTY                                   | ERROR                                         | SUCCESS                  | PARTIAL
 -------------|---------------------------------|-----------------------------------------|-----------------------------------------------|--------------------------|-----------------
 Boot         | splash (static, brand bg) until WebView paints | n/a                       | WebView too old → static update screen        | home                     | n/a
 Home         | n/a                             | n/a (online buttons removed, no gaps)   | n/a                                           | Solo, Tutorial, Settings, About | n/a
 Solo modal   | map thumbnails placeholder tiles| Favourites empty: "Tap ☆ on a map to save it" | thumbnail missing → map name tile         | Start enabled            | removed maps filtered silently
 Map load     | full-screen "Loading <map>" + progress text | n/a                         | "Couldn't load this map" + Back to menu        | spawn view               | n/a
 Spawn        | n/a                             | n/a                                     | n/a                                           | ring on chosen land      | re-pick allowed until confirmed by first tick
 In game      | n/a                             | n/a                                     | WebGL context lost → try restore; if not restored in 3 s: "Game can't resume" + Back to menu | playing | paused overlay (background or back)
 Attack tap   | n/a                             | n/a                                     | invalid target → brief shake/red ripple, no send | amber ripple at tap + attack row | n/a
 Aftergame    | n/a                             | n/a                                     | n/a                                           | win/loss + primary "Play again", secondary "Menu" | n/a
```

## Pass 3 — User Journey: 3/10 → 8/10
```
 STEP | USER DOES                         | USER FEELS           | PLAN SPECIFIES?
 1    | Opens app                         | curious              | splash → home, 1 obvious "Solo" CTA
 2    | Taps Solo, keeps default small map| unsure what to pick  | default = small curated map, Start prominent
 3    | Sees whole map, taps a spot       | oriented             | spawn view fit-to-height in landscape, prompt "Tap to choose your starting land"
 4    | First attack                      | power / confusion    | tap attacks; ripple; compact tutorial step at top
 5    | Mid-game interruption (call)      | annoyed if lost      | pause+mute on background; resume
 6    | Wins/loses (~5-15 min on small map)| satisfaction        | aftergame "Play again" primary
 7    | Plays again                       | hooked (target 40%)  | Play again restarts same settings in one tap
```
5-sec: map + one CTA. 5-min: first expansion succeeds. Long-term: E9 short-session mode (deferred).

## Pass 4 — AI Slop Risk: 6/10 → 8/10
Classification: APP UI (OPERATE). No hard rejections. Specific choices recorded: dark translucent panels (reuse existing HUD styling), one amber accent for ratio/active states, Overpass (open, already in `resources/fonts`) replaces `OpenFront.ttf` for all UI, tabular numerals for counts. Remaining: brand mark and splash art undefined → rebrand task (taste, user picks look).

## Pass 5 — Design System: 2/10 → 6/10
No DESIGN.md. Decided: reuse existing Tailwind/Lit HUD styling; new mobile overlays (pause/quit, confirm-exit, WebView-too-old, About, map-load error, context-lost) use the same panel component. Recommend /design-consultation after the playtest to write DESIGN.md for the rebrand (deferred).

## Pass 6 — Responsive & Accessibility: 2/10 → 8/10
Decided: landscape-locked (`android:screenOrientation="sensorLandscape"` in the Capacitor Android manifest + CSS baseline for ≥ 640x320); touch targets ≥48 CSS px with ≥8 px spacing (supersedes 44 px); HUD text ≥14 CSS px, numbers ≥16; safe-area `env()` insets on all HUD edges; existing colorblind graphics preset kept in settings; player-name labels hidden below a zoom threshold where they overlap (measure in Step 4). Screen readers: out of scope for a real-time canvas game; menus keep semantic buttons.

## Pass 7 — Unresolved design decisions
| Decision | Resolution |
|---|---|
| Orientation | Landscape-locked (both voices) |
| Gesture model | Tap = movement <10 CSS px and <250 ms, one pointer, never had a second pointer → primary action (attack/spawn). Drag → pan. Pinch → zoom; any gesture that had 2 pointers never attacks. Long-press 400 ms → existing radial menu (build, boat, alliance, info). |
| Instant attack vs confirm | TASTE: keep instant attack (current behavior, speed matters vs bots) + ripple feedback; revisit if playtest shows mis-attacks |
| Ratio control | TASTE: four 48 px preset buttons 25/50/75/100 on the right edge (Antigravity's discrete pills, Claude's position); existing fine slider stays in settings |
| Top strip | timer + pause only (48 px); fast-forward, settings, quit move into the pause overlay; fullscreen and exit hidden under shell |
| Tutorial | Reuse existing 22-step tutorial (DRY, no new onboarding); restyle as a one-line top banner ≤15% height with expand; never covers the bottom-right ratio control |
| Back per screen | splash: ignore; home: modal→close, else confirm exit; solo modal: close; loading: ignore; spawn/in game: modal→close, else pause overlay; pause overlay: resume; aftergame: menu; About/Settings: close; WebView-too-old: exit app |
| Font | Overpass (open) replaces OpenFront.ttf; layout pass done with it |
| Locales | Ship all 42 `resources/lang` files; new strings added to en.json, others fall back to English via existing translateText behavior |
| About entry | Home → About button and Settings → About; content order: name, version + git tag, AGPL-3.0 + source link, "Contains assets from OpenFront (CC BY-SA 4.0)" |
| Playtest log | add per player: first moment of confusion, observed fail point (spawn / first attack / ratio / mid-game) |
| Brand look (logo, splash, colors) | TASTE → user decides; until then a plain wordmark in Overpass Bold on the existing dark background |

## Design NOT in scope
DESIGN.md / full brand system (after playtest), haptics (E11), select-then-confirm attack, portrait support, screen-reader support for the canvas, new onboarding flow.

## Design: what already exists
Mobile home layout + `mobile-nav-bar`; mobile bottom HUD bar; long-press radial menu; colorblind preset; Overpass font; tutorial system (22 steps); `translateText` + 42 locales; dark panel styling.

## Design Completion Summary
```
  +====================================================================+
  |         DESIGN PLAN REVIEW — COMPLETION SUMMARY                    |
  +====================================================================+
  | System Audit         | no DESIGN.md; UI scope: home, solo, HUD, overlays |
  | Step 0               | 3/10, all 7 dimensions (autoplan)           |
  | Pass 1  (Info Arch)  | 3/10 → 9/10 after fixes                     |
  | Pass 2  (States)     | 2/10 → 9/10 after fixes                     |
  | Pass 3  (Journey)    | 3/10 → 8/10 after fixes                     |
  | Pass 4  (AI Slop)    | 6/10 → 8/10 after fixes                     |
  | Pass 5  (Design Sys) | 2/10 → 6/10 after fixes                     |
  | Pass 6  (Responsive) | 2/10 → 8/10 after fixes                     |
  | Pass 7  (Decisions)  | 12 resolved, 1 deferred (brand look)        |
  +--------------------------------------------------------------------+
  | NOT in scope         | written (6 items)                           |
  | What already exists  | written                                     |
  | TODOS.md updates     | 2 items proposed (DESIGN.md, haptics)       |
  | Approved Mockups     | 0 generated (no OpenAI key), 0 approved     |
  | Decisions made       | 12 added to plan                            |
  | Decisions deferred   | 1 (brand look → final gate)                 |
  | Overall design score | 2/10 → 6/10 (lowest pass: Design System)    |
  +====================================================================+
```

<!-- autoplan-accepted:design -->
- Orientation: app is landscape-locked (`android:screenOrientation="sensorLandscape"`); mobile CSS baseline targets landscape ≥640x320. Replaces "app locked to one orientation chosen in the design phase".
- Gesture model under the shell: tap = <10 CSS px movement and <250 ms with one pointer that never had a second pointer → primary action (spawn/attack); drag → pan; pinch → zoom and any gesture that ever had 2 pointers never attacks; long-press 400 ms → existing radial menu. Attack stays instant on tap, with an amber ripple at the tap point; an invalid target shows a red ripple and sends nothing. Verified by unit tests on the gesture classifier (tap, slow tap, drag, pinch-with-early-lift) and the device checklist.
- HUD layout (landscape): bottom-left economy pill (troops + rate + max bar, gold); right-edge ratio control = four 48 px preset buttons 25/50/75/100 (current highlighted amber), fine slider kept in settings; top-left leaderboard button showing rank; top-center latest critical event toast; top-right timer + pause only. Fast-forward, settings and quit move into the pause overlay; fullscreen and exit are hidden under the shell; chat and keybind hints hidden. All HUD containers apply `env(safe-area-inset-*)`.
- Touch targets ≥48 CSS px with ≥8 px spacing (supersedes 44 px); HUD text ≥14 CSS px, numeric readouts ≥16 CSS px.
- Tutorial: reuse the existing tutorial steps; under the shell it renders as a top banner ≤15% of screen height (expandable), never covering the ratio control or the economy pill.
- States: map loading shows a full-screen "Loading <map>" screen; map load failure shows "Couldn't load this map" + Back to menu; WebGL context lost → attempt restore, and if not restored within 3 s show "Game can't resume" + Back to menu; Favourites empty shows "Tap ☆ on a map to save it"; maps removed by curation are filtered from favourites silently; aftergame shows "Play again" (same settings, one tap) as primary and "Menu" as secondary.
- Spawn: in landscape the spawn view fits the map height; the existing "Choose a starting location" prompt stays; re-pick is allowed until the spawn is accepted.
- Back button per screen: splash ignore; home close modal else confirm exit; solo modal close; loading ignore; spawn/in game close modal else pause overlay; pause overlay resume; aftergame → menu; About/Settings close; WebView-too-old exit app.
- Home under the shell keeps Solo, Tutorial, Settings and About with no empty gaps where online buttons were removed; About is reachable from home and settings and lists name, version + git tag, AGPL-3.0 + source link, "Contains assets from OpenFront (CC BY-SA 4.0)".
- Typography: Overpass (already in `resources/fonts`, open license) replaces `OpenFront.ttf` everywhere; the Step 4 layout pass is done with Overpass. Until the brand look is chosen, the wordmark is "World Of Conflict" in Overpass Bold on the existing dark background.
- Locales: all 42 `resources/lang` files ship; new strings go to `en.json` only and fall back to English.
- Playtest log adds per player: first moment of confusion and observed fail point (spawn / first attack / ratio / mid-game).
<!-- /autoplan-accepted:design -->


# Phase 3 — Eng review (auto-decided by /autoplan)

Scope gate: /autoplan — reviewing the World Of Conflict mobile plan (this active plan). Report file: this plan.

## Step 0 — Scope Challenge
A. What already solves each sub-problem (read in code):
- Offline sim: `LocalServer` + engine worker created from an inline Blob (`src/client/WorkerClient.ts:34-38`, `Worker.worker?worker&inline`), so no cross-origin worker fetch.
- Map delivery: `FetchGameMapLoader` fetches `map.bin`/`map4x.bin`/`map16x.bin`/`manifest.json` on the main thread (`packages/shared/src/FetchGameMapLoader.ts:29-32,57`) and the files are transferred to the worker (`mapFilesTransfer`). The worker never fetches.
- Asset URLs: `getAssetManifest()`/`getCdnBase()` read `window.BOOTSTRAP_CONFIG` (`packages/shared/src/AssetUrls.ts:14-33`), which `src/server/RenderHtml.ts:82-91` injects into the EJS `index.html`.
- Gestures: `InputHandler` is pointer-events only (`src/client/InputHandler.ts:595-641`, incl. `pointercancel`), `DRAG_THRESHOLD_PX = 10` (:322), `LONG_PRESS_MS = 800` (:309), tap suppressed mid-pinch (:990-1044).
- WebGL capability gate: `src/client/components/WebGLGate.ts` (software/unsupported/limited), uses `isDesktopShell` for quit.
- Snapshot resume: `WorkerClient` accepts `snapshotToRestore` (:51), making E10 cheaper later.
- Tests: Vitest projects `client` (jsdom, `tests/client/**`, 222 files) and `node` (`vite.config.ts:344-354`).
Minimum change set: unchanged from CEO/Design acceptance; simplifications below reduce it.
Complexity: ~20-25 changed files [estimated], ≥2 new modules (`MobileShell.ts`, `curatedMaps`), so gate trips. Auto-decided: Original feature list kept (P2 never reduce); Smaller arrangement accepted where it preserves behavior (CSP instead of JS guard, reuse WebGLGate, one `curatedMaps()` helper, reuse InputHandler thresholds). Scope Challenge result: **scope accepted as-is** (smaller arrangement, same scope).
Search check: [Layer 1] CSP `<meta>` enforces network policy in documents and Blob workers they create; Capacitor serves `https://localhost` from assets; Android `onRenderProcessGone` exists since API 26. Search unavailable for Aside; in-distribution knowledge used.
TODOS cross-reference: no TODOS.md in repo; deferrals from all phases written below.
Distribution: debug APK via Gradle locally; release AAB + signing deferred (Play listing out of scope). No CI change in this plan.

REALITY: premise-table finding 6 eng premises checked; "module worker needed" FALSE (inline Blob worker), "build new gesture classifier" FALSE (exists), unverified=1 (renderer GL-restore support) src/client/WorkerClient.ts:34
REALITY: already-done finding gesture thresholds and WebGLGate already exist; reuse src/client/InputHandler.ts:322
REALITY: surface-check pass npm scripts dev/dev:host/test/build-prod verified in package.json; `npm run inst` needs npm 12 (engine-strict) package.json:45
REALITY: binding-decisions pass CEO/Design accepted blocks honored; no reversal except taste rows noted vite.config.ts:209
REALITY: numbers pass DRAG_THRESHOLD_PX=10, LONG_PRESS_MS=800 [measured: source]; 222 client test files [measured: ls] src/client/InputHandler.ts:309
REALITY: deferred-asks pass all deferrals listed in NOT in scope with reasons CLAUDE.md:1
REALITY: pr-count pass one branch for the first build (single wave) vite.config.ts:314

## Eng Dual Voices
CLAUDE SUBAGENT (eng — independent review): INPUT eng 69a5d844…, completed; 15 findings (3 high, 8 medium, 4 low). Pointer double-fire claim corrected: InputHandler is already pointer-only with pointercancel.
ANTIGRAVITY SAYS (eng — architecture challenge): attempt 1 timed out at 9 min while reading files (no output); attempt 2 completed (no file reads, facts inlined). 6 findings: [Critical] Blob worker needs CSP `worker-src blob:` and may break under strict origin policy; [High] WebGL context-loss restore needs a full renderer rebuild; [High] mute is not AudioContext suspend (battery), and pause vs tick burst on resume; [Medium] a gesture layer collides with InputHandler; [Medium] Capacitor asset loader MIME/memory for .bin; [Low] a 180° landscape flip moves the cutout onto the ratio buttons.

```
ENG DUAL VOICES — CONSENSUS TABLE:
  Dimension                        Claude          Antigravity        Consensus
  1. Architecture sound?            yes, w/ fixes   concern (worker)   CONFIRMED with fixes (CSP incl. worker-src blob:)
  2. Test coverage sufficient?      no (harness)    not addressed      N/A (single voice)
  3. Performance risks addressed?   no (fps method) no (audio, memory) CONFIRMED concern
  4. Security threats covered?      no (guard→CSP)  CSP/worker         CONFIRMED (CSP)
  5. Error paths handled?           context loss    context loss       CONFIRMED (gate measures; rebuild if frequent)
  6. Deployment risk manageable?    renderer gone   not addressed      N/A (single voice)
```
Integration: #1 accepted (CSP `worker-src 'self' blob:`; gate verifies worker spawn and ArrayBuffer transfer). #2 accepted as a gate measurement (10 background/foreground cycles; any context loss makes a renderer rebuild from the current GameView required before the playtest). #3 accepted (suspend AudioContext; pause is set synchronously on the main-thread LocalServer; a test asserts resume emits no catch-up burst). #4 already resolved (#57: reuse InputHandler, no second classifier). #5 rejected (confidence 3/10: `FetchGameMapLoader` uses `response.arrayBuffer()`, so Content-Type is irrelevant; the transfer bounds memory duplication). #6 accepted (CSS `env()` insets are live; the device checklist includes reverse landscape).

## Section 1 — Architecture
```
 BUILD (mobile mode)                                  RUNTIME (Android, Capacitor WebView https://localhost)
 vite build --mode mobile                             index.html (pre-rendered via RenderHtml template + mobile config)
  |- resolveId/load hook: throw on proprietary/**       |- <meta CSP>  default-src 'self' blob: data:; connect-src 'self' blob: data:
  |- curatedMaps() copies only listed maps              |- inline classic <script> (CSP-hashed): ES module + WebGL2 + Chromium>=target
  |- build.target = WebView floor                       |     fail -> static "Update Android System WebView"
  v                                                     v
 prerender script (imports RenderHtml template)       Main.ts --(isMobileShell)--> MobileShell.ts
  |- BOOTSTRAP_CONFIG {cdnBase:"", identity manifest}   |  network mode "offline": hide online UI, skip boot-time API callers
  v                                                     |  @capacitor/app: appStateChange -> lifecycle pause (pausedByLifecycle)
 checks: no external src/href, proprietary hash,        |                  backButton -> per-screen table
         every curated map in dist, config keys         v
  v                                                    SinglePlayerModal / MapPicker / MapFavorites / random --> curatedMaps()
 npx cap sync android -> gradle assembleDebug           v
                                                       ClientGameRunner -> LocalServer (turns) + WorkerClient (inline Blob worker)
                                                        |                        ^ map files via FetchGameMapLoader (main thread)
                                                        v
                                                       WebGL2 renderer + HUD (landscape mobile CSS) ; WebGLGate on failure
```
Findings:
- [P1] (confidence: 9/10) plan "Offline" bullet — a monkey-patched fetch/WebSocket/sendBeacon guard misses XHR, EventSource, img/script/link/CSS url() and runs only on the main thread. Auto-decided: CSP `<meta>` is the enforcement; JS wrapper kept only as a test/logging hook that returns a synthetic 503 `Response` (no unhandled rejections). (#50, P5)
- [P1] (confidence: 8/10) blocked requests vs "no uncaught console errors" — callers that don't catch would surface unhandled rejections. Auto-decided: boot-time online callers are not invoked under the shell (gate in `Main.ts`), and the runtime test also fails on `unhandledrejection`. (#51, P1)
- [P2] (confidence: 8/10) `src/server/RenderHtml.ts:82` — a hand-maintained static index.html drifts from upstream. Auto-decided: prerender script renders the same EJS template with a mobile config; test asserts every key RenderHtml sets is present. (#52, P5)
- [P2] (confidence: 7/10) WebView renderer process death (`onRenderProcessGone`) is distinct from app process death. Auto-decided: verify Capacitor's handling on the gate device; if it white-screens, override to reload to menu. Added to gate checklist. (#53, P1)
- [P3] (confidence: 8/10) external links (source repo, Play Store) must open in the system browser; `server.allowNavigation` empty; `webContentsDebuggingEnabled` false in release. (#54, P1)
Dispositions: all accepted (auto).

## Section 2 — Code Quality
- [P2] (confidence: 9/10) `src/client/components/WebGLGate.ts:10` — new "WebView too old" screen duplicates WebGLGate. Auto-decided: extend WebGLGate with an "android-webview" status; the inline pre-module script only covers what must run before the bundle parses (ES module support + Chromium version) and shows minimal static text. (#55, P4)
- [P2] (confidence: 8/10) map curation in 5 files → one `curatedMaps()` helper imported by SinglePlayerModal default, `getRandomMapType`, MapPicker, MapDisplay, MapFavorites, tutorial map, Play again. (#56, P4)
- [P2] (confidence: 9/10) gesture spec duplicates InputHandler — reuse existing `DRAG_THRESHOLD_PX=10` and pinch suppression; drop the "<250 ms" tap rule (holds between tap and long-press keep current behavior: release before long-press = tap); keep `LONG_PRESS_MS` at 800 unless playtest shows otherwise. Add `touch-action: none` on the game canvas if absent. (#57, P4)
- [P3] (confidence: 8/10) ratio presets and settings slider must read/write the one existing attack-ratio setting. (#58, P5)
- [P2] (confidence: 7/10) license build check: Vite inlines small assets as base64, defeating a hash-only check. Auto-decided: `resolveId`/`load` hook throws on any `proprietary/` path in mobile mode; hash check stays as a secondary net. (#59, P1)
- [P3] (confidence: 6/10) "attempt WebGL restore within 3 s" may be dead code if the renderer can't rebuild GPU resources. Medium confidence, verify. Auto-decided: show "Game can't resume" directly unless the renderer already handles `webglcontextrestored`. (#60, P5)
Dispositions: all accepted (auto).

## Section 3 — Test Review
Framework: Vitest (CLAUDE.md), projects `client` (jsdom) and `node`. Playwright exists only as the run-openfront skill helper (`.claude/skills/run-openfront/driver.mjs`).
```
CODE PATHS                                              USER FLOWS
[+] MobileShell.ts                                       [+] Offline cold start → game → aftergame
  ├── detect shell present/absent      [GAP] unit         ├── [GAP] [→E2E] airplane-mode critical path (Playwright vs dist, network routed)
  ├── network mode offline/own-server  [GAP] unit         └── [GAP] [→E2E] Play again restarts same settings
  └── hides online UI entry points     [GAP] unit (jsdom)
[+] CSP + guard hook                                     [+] Lifecycle
  ├── remote fetch → 503 Response      [GAP] unit          ├── [GAP] user-paused stays paused after foreground
  └── no unhandledrejection            [GAP] →E2E          ├── [GAP] background in spawn/aftergame → no toggle_pause
[+] curatedMaps()                                          └── [GAP] back during loading ignored
  ├── default map ∈ list & small       [GAP] unit       [+] Gestures (InputHandler, existing)
  ├── random ∈ list                    [GAP] unit          ├── [GAP] pinch with early lift → no TouchEvent
  └── favourites filtered / empty      [GAP] unit          ├── [GAP] pointercancel mid-tap → no attack
[+] Build (mobile mode)                                    └── [GAP] drag ≥10 px → pan, no attack
  ├── proprietary import throws        [GAP] build-script test
  ├── dist/index.html no external src  [GAP] build-script test
  ├── every curated map in dist        [GAP] build-script test
  └── prerender has all RenderHtml keys[GAP] node test
[+] Error states
  ├── map load failure → error overlay [GAP] unit (fetch mocked)
  └── context lost → can't-resume      [GAP] unit (event dispatched)
[+] Engine                             [★★★ TESTED] untouched; LayerBoundaries.test.ts stays green
COVERAGE: 1/24 paths tested | GAPS: 23 (3 E2E) — all added to the plan (approved via acceptance blocks)
```
Harness decision (#61): unit/jsdom for shell, curation, gestures, lifecycle, error overlays; node tests for build scripts and prerender keys; one Playwright smoke (reusing `.claude/skills/run-openfront/driver.mjs` helpers) against built `dist` served locally with `page.route` failing non-local hosts and failing on `pageerror`/`unhandledrejection`. Device checklist covers WebView-only behavior.
Test plan artifact: `C:\Users\Ahmed\.gstack\projects\openfrontio-OpenFrontIO\Ahmed-main-eng-review-test-plan-20261016-030558.md`.
Tests made obsolete: none.

## Section 4 — Performance
- [P2] (confidence: 7/10) fps bar has no measurement method. Auto-decided: log rAF frame times via the existing `PerformanceOverlay`/`GameMetrics` path from minute 5 to 15 on the largest curated map; record median and 1%-low fps, device model, Android and WebView versions in the gate log. (#62, P1)
- [P3] (confidence: 7/10) asset budget should use per-map compressed size inside the AAB (`bundletool` / `unzip -l`), not on-disk `map.bin`. (#63, P1)
- Memory: map.bin up to ~16 MB for the largest maps [measured: du, largest map dirs 11-16 MB] held on main thread before transfer; transfer (not copy) keeps one copy. No new caches or loops.

## NOT in scope (eng)
Persistent save/resume (E10; WorkerClient snapshot support noted as the starting point), WebGL1/canvas fallback, CI for Android builds, release signing, Play listing, iOS, online mode.

## What already exists (eng)
LocalServer, inline Blob worker, FetchGameMapLoader + transfer, BOOTSTRAP_CONFIG via RenderHtml, InputHandler pointer gestures, WebGLGate, PerformanceOverlay, snapshot restore in WorkerClient, Vitest jsdom/node projects, run-openfront Playwright helpers.

## Failure modes (eng)
```
 CODEPATH              | FAILURE                         | TEST     | HANDLED            | USER SEES
 ----------------------|---------------------------------|----------|--------------------|-------------------
 prerender             | upstream adds config key        | node     | test fails build   | n/a
 CSP                   | blocks a needed local resource  | E2E      | smoke test         | n/a (caught pre-ship)
 map load              | 404/truncated                   | unit     | error overlay      | "Couldn't load this map"
 renderer process gone | WebView killed under memory     | device   | reload to menu     | menu
 lifecycle             | resume unpauses user pause      | unit     | pausedByLifecycle  | stays paused
 external link         | navigates WebView away          | unit     | system browser     | browser opens
```
Critical gaps after fixes: 0 (map-load and back-during-load gaps from CEO now have tests and handlers).

## Worktree parallelization strategy
| Step | Modules touched | Depends on |
|---|---|---|
| A. Build mode (prerender, CSP, proprietary hook, curatedMaps copy, checks) | vite.config, scripts/, index.html | — |
| B. Mobile shell + offline UI hiding + lifecycle/back | src/client (Main, MobileShell, overlays) | — |
| C. Capacitor android/ + config | android/, capacitor.config | A |
| D. Mobile HUD/landscape CSS + ratio presets + tutorial banner | src/client/hud, CSS | B |
| E. Feasibility gate + playtest | device | C, D |
Lane 1: A → C. Lane 2: B → D. Launch A + B in parallel; merge; then C, D; then E. Conflict flag: `src/client/Main.ts` and `index.html` touched by A and B — sequence edits to those files.

## Eng Completion Summary
- Step 0: Scope Challenge — scope accepted as-is (smaller arrangement)
- Reality rows: 7/7 applicable rows emitted, 1 unverified premise
- Architecture Review: 5 issues found
- Code Quality Review: 6 issues found
- Test Review: diagram produced, 23 gaps identified (all planned)
- Performance Review: 2 issues found
- NOT in scope: written
- What already exists: written
- TODOS.md updates: 9 items (all phases)
- Failure modes: 0 critical gaps flagged after fixes
- Unresolved decisions: 0 in this review (user challenges wait for the gate)
- Outside voice: antigravity (see integration)
- Parallelization: 2 lanes, 2 parallel / 3 sequential
- Lake Score: N/A


<!-- autoplan-accepted:eng -->
- Network enforcement is a CSP `<meta>` in the pre-rendered `index.html`: `default-src 'self' blob: data:; connect-src 'self' blob: data:; img-src 'self' blob: data:; script-src 'self' blob: 'sha256-<inline check script>'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'`. It replaces the monkey-patched fetch/WebSocket/sendBeacon guard as the enforcement mechanism; a `fetch` wrapper remains only as a logging/test hook that returns a synthetic 503 `Response` for non-local origins. Boot-time online callers are not invoked under the shell (gate in `Main.ts`).
- Offline verification harness: one Playwright smoke test (reusing the `.claude/skills/run-openfront` helpers) against the built mobile `dist` served locally, routing non-local hosts to failure and failing on any non-local request, `pageerror` or `unhandledrejection`, through cold start → solo → small map → spawn → aftergame → Play again; jsdom unit tests for shell detection, network mode, hidden UI, curation, lifecycle and error overlays; node tests for the build scripts.
- Prerender: the mobile `index.html` is rendered from the same EJS template `src/server/RenderHtml.ts` uses, with a mobile config (`cdnBase: ""`, identity asset manifest, no turnstile/stripe/jwt); a node test asserts every key RenderHtml sets is present in the mobile `BOOTSTRAP_CONFIG`.
- License build guard: in mobile mode a Vite `resolveId`/`load` hook throws on any path under `proprietary/`; the dist content-hash check stays as a secondary net.
- Map curation lives in one `curatedMaps()` helper imported by the SinglePlayerModal default, `getRandomMapType`, MapPicker, MapDisplay, MapFavorites, the tutorial map and Play again; a build test asserts every map reachable from those surfaces has its files in `dist`.
- Gestures reuse the existing `InputHandler` (pointer events, `DRAG_THRESHOLD_PX = 10`, pinch tap-suppression, `LONG_PRESS_MS = 800`, `pointercancel`); no second classifier and no "<250 ms" rule. The game canvas has `touch-action: none`. Tests in `tests/client` cover pinch-with-early-lift, `pointercancel` mid-tap and a drag of ≥10 px producing no attack. Supersedes the design block's "<250 ms" and "400 ms" thresholds.
- WebView capability: extend `WebGLGate.ts` with an Android WebView status; the inline pre-module script only checks ES-module support and the Chromium version against `build.target` and shows minimal static text. No separate "WebView too old" component.
- Lifecycle: track `pausedByLifecycle` separately from the user's pause and only undo what lifecycle paused; skip spawn phase, loading and aftergame; on background suspend the Web Audio `AudioContext` (not just mute) and resume it on foreground; a unit test with fake timers asserts resume emits no burst of catch-up turns.
- WebGL context loss: show "Game can't resume" + Back to menu unless the renderer already handles `webglcontextrestored`. The feasibility gate runs 10 background/foreground cycles; if any loses the context, a renderer rebuild from the current GameView becomes required work before the playtest.
- Renderer process death (`onRenderProcessGone`): verified on the gate device; if Capacitor white-screens, override it to reload to the menu.
- External links (source repo, Play Store) open in the system browser; `server.allowNavigation` is empty; `webContentsDebuggingEnabled` is false in release builds.
- Ratio presets and the settings slider read and write the one existing attack-ratio setting.
- Feasibility gate measurement: rAF frame times from minute 5 to 15 on the largest curated map via the existing performance overlay/metrics path; log median and 1%-low fps, device model, Android and WebView versions; a reverse-landscape (180°) check that safe-area insets move with the cutout.
- The asset budget uses each map's compressed size inside the built AAB, not on-disk `map.bin`.
- Build order: lanes A (build mode) and B (mobile shell) in parallel, then C (Capacitor) and D (HUD/CSS), then E (gate + playtest); edits to `Main.ts` and `index.html` are sequenced.
<!-- /autoplan-accepted:eng -->


# Final gate — owner decisions (2026-10-16, gate_rev 1)

Reply: `uc1a uc2a d1a d2b d3a d4a d5a d6a d7a d8a p1b` → **APPROVED with overrides**.

| Item | Choice | Effect |
|---|---|---|
| uc1 | a — fork only, no contact | User Challenge rejected; owner's direction stands. No maintainer outreach in this plan. |
| uc2 | a — port first | Differentiator chosen after the playtest; short-session mode stays in TODOS. |
| d1 | a | Instant tap attack + ripple. |
| d2 | **b (override)** | Ratio control is a vertical slider on the right edge, snapping at 25/50/75/100, replacing the four preset buttons. |
| d3 | a | 4 GB / Snapdragon 6-series reference device, 30 fps median. |
| d4 | a | Name stays "World Of Conflict". |
| d5 | a | Capacitor; the feasibility gate decides. |
| d6 | a | Measure context loss on device first; rebuild the renderer only if it occurs. |
| d7 | a | Crash log deferred. |
| d8 | a | Placeholder wordmark until brand is chosen. |
| p1 | b | Approved with the d2 override. |

Phase rerun note: d2b changes only the form of one HUD control (same position, same stored setting, same tests), so design/eng phases were not rerun; the accepted block below supersedes the preset-button lines in the design and eng blocks.

<!-- autoplan-accepted:gate -->
- Troop-ratio control (owner override d2b): a vertical slider anchored to the right edge, at least 48 px wide with a ≥48 px thumb, snapping to 25/50/75/100 with the current value shown in ≥16 px text above it; it reads and writes the one existing attack-ratio setting (the settings slider stays as-is). Replaces the four 25/50/75/100 preset buttons in the design and eng blocks. Verified by a jsdom test that dragging the slider snaps to the nearest stop and updates the shared setting, plus the device checklist (one-thumb reach, not under the gesture-nav inset).
- Maintainer outreach (uc1a): not part of this plan; the thin-layer/UPSTREAM.md rules remain the drift mitigation.
<!-- /autoplan-accepted:gate -->

| 68 | Gate | Owner overrides: uc1a (no outreach), d2b (snapping slider) ; others recommended | Owner | — | Final gate reply | — |
