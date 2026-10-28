---
title: "Quick Difficulty and Tribes rows replace the big difficulty grid on the phone's solo setup"
author: AhmedGamalFarouk
date: 2026-10-28
branch: main
cost: { minutes: 12, tokens: 121618 }
id: l-219c468c
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/QuickSetup.ts
  - tests/client/mobile/QuickSetup.test.ts
  - src/client/mobile/mobile-theme.css
---

## Decided
On the phone, Difficulty (all four levels) and Tribes presets (Off, 100, 200, 400, where 400 is the game default and the slider max) sit right under the map strip. Upstream's difficulty grid is hidden there because it would be a second copy of the same control. The selected button gets a tint, not a gold face, so START stays the only gold button. The phone has its own featured list of six maps (MOBILE_FEATURED_IDS), because upstream features only two of the curated maps.
## Tried and ruled out
- Wrapping upstream's difficulty section in an isMobileShell() check: Prettier re-indented about 60 upstream lines, which makes merges expensive. A CSS :has(difficulty-info) rule hides it with no TS diff instead.
- The outside mock's Bots 10/25/50 presets, Est. Duration and Dominance Goal rows: they don't match the game's real values (tribes run 0 to 400).
## Watch out
Strip cards need min-width: 0. Without it, a long name with nowrap ("BOSPHORUS STRAITS") makes its card wider, the 2:1 thumbnail grows, and the quick rows get pushed below the fold at 844x390.
The `body.mobile-theme *` thin-scrollbar rule outranks a plain .wc-map-strip selector.
In the code: src/client/mobile/QuickSetup.ts, CuratedMaps.MOBILE_FEATURED_IDS, the quick-row and strip rules in src/client/mobile/mobile-theme.css.
