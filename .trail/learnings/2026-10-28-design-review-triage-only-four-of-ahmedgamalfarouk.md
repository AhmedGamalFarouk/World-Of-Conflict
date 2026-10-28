---
title: "Design review triage: only four of the outside review's points were real; radial gold attack wedge and tile redesign dropped"
author: AhmedGamalFarouk
date: 2026-10-28
branch: main
cost: { minutes: 1, tokens: 1185 }
id: l-28e54a1b
scope: repo
status: active
src: agent
touches:
  - src/client/hud/layers/SettingsModal.ts
  - src/client/hud/layers/GameRightSidebar.ts
  - src/client/hud/layers/RadialMenuElements.ts
  - src/client/mobile/mobile-theme.css
---

## Decided
Checked an outside UI review against the build before acting. Real and fixed: dev tools block in the in-game Menu (src/client/hud/layers/SettingsModal.ts, hidden on mobile), pause button gold (src/client/hud/layers/GameRightSidebar.ts, now steel so the lit Send stop is the only gold), yellow Build wedge (src/client/hud/layers/RadialMenuElements.ts, navy on mobile), Defeat card button row and Home column balance.
## Tried and ruled out
- Tutorial banner points: already fixed by earlier commits; the review used stale screenshots.
- Gold attack wedge: icons are white, about 2:1 on gold. Red and green wedges carry meaning, so kept.
- Icon tiles, spawn DEPLOY step, key art, XP: product or asset decisions, left for separate tasks.
## Watch out
Defeat card shared the pause card's 3-column button row, which left an empty third column.
In the code: .wc-result-card .wc-pause-row and the max-height 430px Home grid areas in src/client/mobile/mobile-theme.css. Phone screenshots go black if the screen sleeps; wake it first.
