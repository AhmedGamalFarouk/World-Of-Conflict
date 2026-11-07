---
title: "Long games resume in full: no cap on catch-up time"
author: AhmedGamalFarouk
date: 2026-11-07
branch: main
cost: { minutes: 1, tokens: 1783 }
id: l-e790899a
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/SaveStore.ts
  - src/client/mobile/SaveHome.ts
  - docs/mobile/NEXT-STEPS.md
---

## Decided
The owner measured resume on a phone and found the catch-up time acceptable, so a saved game always resumes, however long it ran. The home screen warns before a long resume, and the pause card shows a progress line while it catches up.

## Tried and ruled out
A cap: refuse CONTINUE past N game minutes and offer to discard the save. It costs the player their game to save waiting time the owner already finds acceptable.

## Watch out
A save is the list of turns, not the game state, so resume time grows with game length. If testers quit during catch-up, the fix is an engine snapshot, not a cap; the snapshot needs an engine change the project rules forbid.

In the code:
- `src/client/mobile/SaveStore.ts` `catchUpMinutes`, used by the warning in `src/client/mobile/SaveHome.ts`
- Plan: `docs/mobile/NEXT-STEPS.md` section 3
