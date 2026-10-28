---
title: Upstream server and hosting files deleted; map generator and unshipped maps kept
author: AhmedGamalFarouk
date: 2026-10-28
branch: main
cost: { minutes: 14, tokens: 113733 }
id: l-26b814ba
scope: repo
status: active
src: agent
touches:
  - scripts/PublicAssetManifest.ts
  - package.json
  - tests/LayerBoundaries.test.ts
  - vite.config.ts
  - scripts/mobileBuild.ts
  - CLAUDE.md
---

## Decided
The fork is an offline Android app, so upstream's multiplayer server, its tests, and the hosting/deploy setup (Docker, nginx, supervisord, deploy/update scripts) were deleted. `npm run dev` now runs the mobile build in the browser (vite --mode mobile, port 9000); singleplayer turns come from the client's LocalServer, so nothing needs the server.

## Tried and ruled out
Deleting the map generator: it is the source of every map's info.json and Maps.gen.ts, and the map consistency test checks it in about ten places. Without it no map can be added or changed. Kept.
Deleting the ~120 maps the app doesn't ship: each one is a GameMapType enum entry in the engine, with translations and playlists, so removing them is engine surgery, not file deletion. Kept; the mobile build already copies only the curated maps.
Deleting the client's server-facing code (lobbies, matchmaking, Steam/desktop): it is imported into the client, so removing it is a refactor. Left for later.

## Watch out
The mobile build used a helper from the server folder; it moved to scripts/PublicAssetManifest.ts.
The Windows shell-test learning is obsolete: those update.sh tests were deleted.
Server npm dependencies (express, ws, pg…) are still in package.json; dropping them needs a lockfile regen with npm 12.

In the code: package.json scripts, tests/LayerBoundaries.test.ts (server layer removed), vite.config.ts and scripts/mobileBuild.ts import ./scripts/PublicAssetManifest.
