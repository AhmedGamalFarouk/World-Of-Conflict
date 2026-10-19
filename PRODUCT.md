# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

A custom game UI (Lit + Tailwind 4) running in the Android System WebView through Capacitor. Not Material. It must honor Android behaviors: hardware/gesture back, status bar and cutout safe areas, gesture-nav insets, app backgrounding.

## Users

Casual phone players, new to the territory-conquest genre, playing short sessions (commute, breaks) offline against bots. They want to start a game fast and understand what is happening without prior OpenFront knowledge. Veterans of openfront.io are a secondary audience, not the design target.

## Product Purpose

World Of Conflict is a phone adaptation of OpenFront (openfront.io), a real-time territory-conquest strategy game: expand from a spawn point, attack neighbours with a share of your troops, build, and outlast bots. The first build is single-player vs bots, fully offline, Android first (iOS later). Success for the first build: a playtest where ≥60% of players finish a game and ≥40% start a second (docs/mobile/PLAN.md, product gate).

## Positioning

Undecided by the owner (gate decision uc2a: port first). The differentiator is chosen after the playtest; a short-session mode is the leading candidate (TODOS.md). Until then the claim is only "OpenFront's game, built for a phone, playable offline". Do not invent a stronger claim.

## Operating Context

- Held in landscape (app is locked to `sensorLandscape`), one or two thumbs, often in short interrupted sessions; calls and app switches pause the game.
- No network: no accounts, store, clans, news, lobbies or multiplayer in this build. These online surfaces are hidden under the mobile shell, not redesigned.
- Flow: home → solo setup (map, bots, difficulty) → loading → spawn pick → game ⇄ pause → aftergame → home. Tutorial reuses the existing steps.
- Reference device: 4 GB RAM, Snapdragon 6-series class, Android 11+; landscape ≥640x320 CSS px.

## Capabilities and Constraints

- Engine untouched (`packages/engine*`); the simulation is deterministic and shared with upstream.
- Thin-layer rule: mobile changes stay in mobile-only CSS, `src/client/mobile/`, and small `isMobileShell()`/`isOffline()` gates so upstream OpenFront merges stay cheap.
- 15 curated maps ship (`src/client/mobile/CuratedMaps.ts`); the rest are filtered out.
- Touch: tap = primary action (spawn/attack, instant), drag = pan, pinch = zoom (never attacks), long-press = radial menu; existing `InputHandler` thresholds.
- Accepted HUD decisions (PLAN.md design + gate blocks): bottom-left economy pill, right-edge vertical ratio slider snapping 25/50/75/100, top-left leaderboard, top-center critical event toast, top-right timer + pause; fast-forward/settings/quit in the pause overlay.
- All user-visible text through `translateText()` with entries in `resources/lang/en.json`; 42 locales ship with English fallback.
- No proprietary OpenFront assets (`proprietary/` is excluded by the build).

## Brand Commitments

- Name: "World Of Conflict" (owner decision d4). App id `com.worldofconflict.game`.
- A new brand identity (wordmark, palette, type, splash, icon) replaces both the OpenFront look and the placeholder wordmark (owner decision, 2026-10-16).
- Visual direction (owner decision, 2026-10-16): the mobile strategy-game category standard, executed at full craft, not reinvented. Craft bar: Clash of Clans / Clash Royale (Supercell polish, readable chunky controls, clear hierarchy) and the genre neighbours Territorial.io and Risk mobile.
- Must not use OpenFront's logo or trademark as its brand. Must keep an About screen crediting OpenFront ("Contains assets from OpenFront (CC BY-SA 4.0)"), stating AGPL-3.0 and linking the public source repo.

## Evidence on Hand

- Open replacement assets: `mobile/assets/` (font, logo, favicon, sounds), map and flag data under `resources/` (CC BY-SA).
- Reviewed plan: `docs/mobile/PLAN.md`; deferred work: `TODOS.md`; build/gate: `docs/mobile/ANDROID.md`.
- No playtest data, player quotes, store listing or metrics exist yet. Do not fabricate them.

## Product Principles

1. Seconds to first conquest: from launch to playing should take as few taps as possible, with sensible defaults.
2. The map is the game: chrome yields to the battlefield; information appears when it matters.
3. Thumb-first in landscape: every frequent action is reachable without shifting grip.
4. Teach by playing, not by reading.
5. Stay mergeable: redesign through the mobile layer, never by forking upstream components wholesale.

## Accessibility & Inclusion

Touch targets ≥48 CSS px with ≥8 px spacing; HUD text ≥14 CSS px, numbers ≥16 CSS px (PLAN.md). Colour must not be the only carrier of player identity or state (upstream ships a colourblind graphics preset).
