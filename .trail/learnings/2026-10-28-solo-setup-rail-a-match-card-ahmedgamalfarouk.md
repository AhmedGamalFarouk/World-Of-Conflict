---
title: "Solo setup rail: a match card above START, and a featured strip with All maps behind a steel button"
author: AhmedGamalFarouk
date: 2026-10-28
branch: main
cost: { minutes: 15, tokens: 201230 }
id: l-8a72b7a9
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/SoloSummary.ts
  - src/client/components/map/MapPicker.ts
  - src/client/mobile/mobile-theme.css
  - tests/client/mobile/SoloSummary.test.ts
---

## Decided
The solo rail shows a match card (map thumbnail, name, tribes, difficulty) above START. The map section opens on one swipeable strip: the picked map, then featured, then favourites, then Random. A steel ALL MAPS button opens upstream's tabs, and picking a map there returns to the strip.
## Tried and ruled out
- A strip of featured maps only: just 2 of the 15 curated maps are featured (World, Europe), so it was only a row of three cards. Favourites and the picked map were added to it.
- A nations row on the card: not asked for; difficulty already shows Disabled when the map has no nations.
## Watch out
The page has two map-pickers. The hidden host-lobby modal renders one as well, so querySelector('.wc-map-strip') can match the wrong one.
On touch the favourite star only showed on hover. The CSS now always shows it on the picked card.
In the code: src/client/mobile/SoloSummary.ts, MapPicker.renderStrip, .wc-solo-summary and .wc-map-strip in src/client/mobile/mobile-theme.css.
