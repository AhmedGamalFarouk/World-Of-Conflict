# TODOS — World Of Conflict (mobile fork)

Deferred from the /autoplan review of the mobile plan (2026-10-16). Each item is out of the first offline Android build.

## P2 — Short-session mode (E9)
- **What:** A phone-first mode: small maps, fewer bots, faster default speed, 5-10 minute target.
- **Why:** Both CEO reviewers said this is the real differentiator vs territorial.io and other OpenFront ports.
- **Pros:** Gives players a reason to pick this app; fits phone sessions.
- **Cons:** Needs balancing; pointless until the playtest shows the base game works on phones.
- **Context:** Uses existing engine config (no engine changes). Start from the playtest log's match lengths.
- **Effort:** human M / CC S
- **Depends on:** product gate (playtest) results.

## P2 — Save/resume across app kill (E10)
- **What:** Persist the running game so a killed app resumes where it left off.
- **Why:** Android kills backgrounded apps; today relaunch returns to the menu.
- **Pros:** No lost games after calls/app switching.
- **Cons:** Snapshot size and versioning.
- **Context:** `src/client/WorkerClient.ts` already accepts `snapshotToRestore`; start there.
- **Effort:** human L / CC M
- **Depends on:** first build shipped; playtest shows interruptions are a top complaint.

## P3 — Haptics (E11)
- **What:** Short vibration on attack sent / under attack, opt-out in settings.
- **Why:** Touch feedback beyond the visual ripple.
- **Pros:** Feels native.
- **Cons:** New dependency (`@capacitor/haptics`).
- **Context:** Hook where the ripple is drawn.
- **Effort:** human S / CC S
- **Depends on:** none.

## P3 — On-demand map downloads (E12)
- **What:** Download maps beyond the curated set (Play Asset Delivery or HTTP).
- **Why:** 135 maps / 615 MB cannot ship in the base app.
- **Pros:** Full map variety.
- **Cons:** Needs hosting or Play asset packs; breaks pure-offline guarantee for extra maps.
- **Context:** `curatedMaps()` is the single place to extend.
- **Effort:** human L / CC M
- **Depends on:** store release.

## P2 — Local crash/error log, opt-in reporting (E13)
- **What:** Exportable local log of crashes/WebView errors for testers; later opt-in remote reporting.
- **Why:** Sideloaded testers give no crash data.
- **Pros:** Debuggable playtest failures.
- **Cons:** Remote reporting needs a privacy policy and a service.
- **Context:** Play Console vitals cover the first closed track.
- **Effort:** human M / CC S
- **Depends on:** privacy policy for remote part.

## P3 — DESIGN.md / brand system
- **What:** Write DESIGN.md (colors, type, components) and the final brand look (logo, splash, icon).
- **Why:** The first build uses a placeholder wordmark.
- **Pros:** Consistent rebrand.
- **Cons:** Design time.
- **Context:** Run /design-consultation after the playtest.
- **Effort:** human M / CC S
- **Depends on:** brand name confirmed.

## P2 — Online multiplayer on our own server
- **What:** `MobileShell` network mode `"own-server"` pointing at a self-hosted `src/server`.
- **Why:** Multiplayer is the genre's retention loop.
- **Pros:** Real players instead of bots.
- **Cons:** Hosting cost; the closed API (auth/stats) must be replaced or dropped.
- **Context:** Add `"android"` to `ClientPlatform` in `packages/shared/src/WireSchemas.ts` here.
- **Effort:** human XL / CC L
- **Depends on:** product gate passed.

## P3 — iOS build
- **What:** Capacitor iOS target.
- **Why:** Second platform.
- **Pros:** Same codebase.
- **Cons:** AGPL vs App Store terms needs research first; WKWebView WebGL2 differences.
- **Context:** Research licensing before any code.
- **Effort:** human L / CC M
- **Depends on:** Android build proven.

## P3 — Store release
- **What:** Play Console listing, release signing, privacy policy, closed testing track.
- **Why:** Distribution beyond sideloading.
- **Pros:** Play vitals, reach.
- **Cons:** Policy work; source tag per release (AGPL).
- **Context:** Release AAB ≤150 MB from the curated build.
- **Effort:** human M / CC S
- **Depends on:** rebrand and About screen done.

## Deferred from the playtest-readiness autoplan (2026-10-19)

## P2 — CI build of the playtest APK on tag
- **What:** GitHub Actions workflow that runs `npm run android:release` on a `v*` tag push and attaches the APK to the Release.
- **Why:** Removes the last manual steps of the release and makes every APK reproducible from its tag.
- **Pros:** No "built from the wrong tree" risk; anyone can rebuild a release.
- **Cons:** Needs a JDK/Android SDK runner setup and a stable debug or release keystore in CI secrets.
- **Context:** docs/mobile/PLAYTEST-PLAN.md E6. The local script and gate (D1-D3) already define the steps.
- **Effort:** human M / CC S
- **Depends on:** public repo; playtest-readiness landed.

## P2 — Top-centre critical event plate
- **What:** A red-edged plate top-centre that shows only critical events (under attack, ally betrayed, nuke inbound).
- **Why:** PLAN.md HUD design block; deferred until testers report missing events.
- **Pros:** Fewer missed attacks on a small screen.
- **Cons:** More HUD on 390px of height.
- **Context:** PLAYTEST-PLAN.md premise 3 / E7. Read the playtest log for "didn't notice" complaints first.
- **Effort:** human M / CC S
- **Depends on:** playtest results.

## P2 — Theme the spawn_failed modal for the mobile shell
- **What:** Restyle or replace the upstream spawn_failed modal under `body.mobile-theme`.
- **Why:** It is the one off-theme dialog left in the mobile app (design review M8).
- **Pros:** Consistent look; Android back closes it predictably.
- **Cons:** Small CSS; touches an upstream DOM shape.
- **Context:** ClientGameRunner.ts:1078; kept as upstream on purpose by PLAYTEST-PLAN.md S8.
- **Effort:** human S / CC S
- **Depends on:** none.

## P2 — "World Of Conflict" name and public repo hygiene
- **What:** Trademark search for the name; README and CONTRIBUTING for the public repo (build-from-source steps, mobile build).
- **Why:** The public tag is permanent and the name is user-facing (CEO V5, DX pass 7).
- **Pros:** Avoids a forced rename after testers know the name.
- **Cons:** Owner time.
- **Context:** App id com.worldofconflict.game is permanent once on Play.
- **Effort:** human S / CC S
- **Depends on:** none; before the v0.1.0 tag.
