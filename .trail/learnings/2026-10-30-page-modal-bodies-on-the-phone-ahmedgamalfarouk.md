---
title: Page modal bodies on the phone need a host-context rule because the modal sits in a shadow root
author: AhmedGamalFarouk
date: 2026-10-30
branch: main
cost: { minutes: 16, tokens: 111973 }
id: l-e7076b08
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/mobile-theme.css
  - src/client/components/baseComponents/Modal.ts
  - docs/mobile/ANDROID.md
---

## Decided
Restyle the modal body (Night, no blur) with a host-context selector, and cards (Plate + hairline) from the page stylesheet that o-modal mirrors into its shadow root. The designer bot's proposal to remap surface tokens was wrong: the surface token already maps to Plate; the muddy look came from a literal translucent black plus blur on the modal section.

## Tried and ruled out
`body.mobile-theme o-modal section` does not match: the section is inside o-modal's shadow root.

## Watch out
The Plate fill on `.bg-white/5` cards beats `hover:bg-white/10`, so cards lose hover feedback on mobile (fine for touch). Designer-bot screenshots can be stale, so verify each finding in code first (the troop-rate Ember colour and the gold unit tiles were deliberate and were rejected).

In the code: src/client/mobile/mobile-theme.css (`:host-context(body.mobile-theme) section`), src/client/components/baseComponents/Modal.ts:170.
