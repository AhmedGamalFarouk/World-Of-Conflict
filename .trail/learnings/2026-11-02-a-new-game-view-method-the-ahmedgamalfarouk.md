---
title: "A new game-view method the HUD calls must also go on the replay viewer's stand-in game"
author: AhmedGamalFarouk
date: 2026-11-02
branch: main
cost: { minutes: 10, tokens: 69685 }
id: l-afb3c5c6
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/mobile-theme.css
  - src/client/replay/ReplayGameAdapter.ts
  - src/client/view/GameView.ts
  - tests/client/replay/ReplayGameAdapter.test.ts
  - tests/client/graphics/layers/EventsDisplayHandlers.test.ts
  - tests/client/controllers/SoundEffectController.test.ts
  - docs/mobile/store/05-territory.png
---

## Decided
The phone HUD now skips old events (catch-up, resumed-save replay) through one `isReplaying()` check on the game view. The replay viewer drives the same event feed through its own stand-in game object, so that object got `isReplaying()` returning false: in a replay every event is one the viewer came to see.

## Watch out
The replay viewer's stand-in only implements what the HUD reads and is cast to the game view type, so the typecheck does not catch a missing method. A new call from the event feed (or any HUD component the replay viewer mounts) crashes it at runtime. The replay adapter tests catch it ("this.game.isReplaying is not a function"); fake games in client tests need the method too.

In the code: src/client/replay/ReplayGameAdapter.ts (asGameView cast), src/client/view/GameView.ts isReplaying/resumeTurnCount, tests/client/replay/ReplayGameAdapter.test.ts, fakes in tests/client/graphics/layers/EventsDisplayHandlers.test.ts and tests/client/controllers/SoundEffectController.test.ts.
