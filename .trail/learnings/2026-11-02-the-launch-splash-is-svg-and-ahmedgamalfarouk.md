---
title: "The launch splash is SVG and CSS on the compositor, not a video"
author: AhmedGamalFarouk
date: 2026-11-02
branch: main
cost: { minutes: 2, tokens: 30017 }
id: l-f51be363
scope: repo
status: active
replaces: l-5cfcd2a6
src: agent
touches:
  - DESIGN.md
  - resources/lang/ar.json
  - resources/lang/en.json
  - src/client/LangSelector.ts
  - src/client/UserSettingModal.ts
  - src/client/mobile/Settings.ts
  - src/client/mobile/mobile-theme.css
  - tests/client/mobile/Settings.test.ts
  - index.html
---

## Decided
The launch frame is an inline SVG globe on a fixed CSS timeline: the globe fades and scales in alone at the centre, the gold quarter grows from the centre and turns 360° with ease-in-out, then the lockup slides left and the wordmark fades in. Every animated piece is its own HTML element and only transform or opacity animates, so the GPU compositor runs it while the bundle parses on the main thread. JS only adds the font class and times the exit.

## Tried and ruled out
- A video splash: MBs in the APK, a black or poster frame before the WebView decodes it, soft on high-DPI screens, one cut per aspect ratio, and it can't honour reduced motion or wait for the font.
- Animating inside the SVG (rotate on a path, stroke-dashoffset draw-in) and starting the slide from JS on animationend: all of it ran on the main thread and stuttered on the phone while the bundle loaded.

## Watch out
The slide distance is hard-coded (translateX(-1.93em) = half of gap + "CONFLICT" width in Barlow Condensed 800, measured centred to 0.2 px at two screen sizes); re-measure if the wordmark's text or type changes. The drop shadow sits on the mark container, not the globe SVG, or it falls onto the wedge layer under it. The word stays hidden until Barlow Condensed loads, so the globe can end left of an empty space if the font never comes.

In the code: index.html, the #wc-boot block (.wc-boot-lockup, .wc-boot-spin, .wc-boot-claim, .wc-boot-word, the inline script).
