---
title: "Saved games resume from an engine snapshot, replaying only the last minute"
author: AhmedGamalFarouk
date: 2026-11-07
branch: main
cost: { minutes: 35, tokens: 249705 }
id: l-c7c6e7d2
scope: repo
status: active
replaces: l-e790899a
src: agent
touches:
  - packages/engine/src/game/GameImpl.ts
  - packages/engine/src/game/Game.ts
  - packages/engine/src/GameRunner.ts
  - packages/engine-api/src/worker/WorkerMessages.ts
  - packages/engine/src/worker/Worker.worker.ts
  - src/client/WorkerClient.ts
  - tests/core/snapshot/FullStateUpdate.test.ts
  - src/client/mobile/SaveStore.ts
  - src/client/mobile/AutoSave.ts
  - src/client/LocalServer.ts
---

## Decided
The owner lifted "engine untouched" for this one change. Each 60 s autosave also stores an engine snapshot; CONTINUE restores it and replays only the turns after it, so resume no longer grows with game length. A restored engine's first tick sends the client the whole state it would have built up over the game, because the engine only sends what changed and a restored client starts empty. The turn list is still saved in full, so a save without a snapshot, or one whose snapshot won't restore, falls back to replaying every turn.

## Tried and ruled out
A cap on resumable game length: it costs the player their game. Making the worker replay faster: it still grows with game length. Sending the full state as its own update at worker start: the client drops updates that arrive before it starts listening, so the full state rides on the first tick instead, and a resume always keeps at least one turn after the snapshot so that tick happens even when the game opens paused.

## Watch out
Only the periodic autosave waits for a new snapshot (and gives up after 2 s); background and exit saves reuse the last one so they land at once. A snapshot from earlier is still valid because the turns after it are saved too. The local server must be told how many turns the snapshot already holds, or its backlog never empties and live turns stop. Headless Chromium checks need a real GPU: the game refuses software WebGL.

In the code:
- Engine: `GameImpl.queueFullState`, `livePlans` (Game snapshot v2, migration from v1), `GameRunner.fullStatePending`, worker `snapshot_result.tick`
- Client: `AutoSave.ts` `setGameSnapshotter`, `saveNow(freshSnapshot)`; `SaveStore.ts` `SavedGame.snapshot`, `replayTurns`; `ClientGameRunner.ts` restore with fallback and `skipRestoredTurns`; `LocalServer.ts` one turn past the snapshot, `turnComplete(count)`
- Tests: `tests/core/snapshot/FullStateUpdate.test.ts`, `tests/client/mobile/AutoSave.test.ts`, `LocalServerResume.test.ts`
- Headless GPU launch: chromium args `--use-angle=d3d11 --ignore-gpu-blocklist --enable-gpu`
