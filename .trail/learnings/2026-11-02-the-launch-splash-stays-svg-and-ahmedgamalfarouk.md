---
title: "The launch splash stays SVG and CSS, not a video"
author: AhmedGamalFarouk
date: 2026-11-02
branch: main
cost: { minutes: 3, tokens: 104925 }
id: l-5cfcd2a6
scope: repo
status: active
src: agent
touches:
  - DESIGN.md
  - android/app/capacitor.build.gradle
  - android/capacitor.settings.gradle
  - index.html
  - package-lock.json
  - package.json
  - resources/lang/ar.json
  - resources/lang/en.json
  - src/client/UserSettings.ts
  - src/client/controllers/SoundEffectController.ts
---

## Decided
The launch frame is an inline SVG globe with CSS keyframes: it draws in alone at the centre, the gold quarter scales in then turns 360° with ease-in-out, then the lockup slides left and the wordmark fades in. The slide waits for the turn's animationend and for Barlow Condensed, not for timers.

## Tried and ruled out
A video splash: it adds MBs to the APK, shows a black or poster frame before the WebView decodes it, is soft on high-DPI screens, needs a cut for every aspect ratio, and can't honour prefers-reduced-motion or wait for the font. The SVG is ~2 KB and pixel-sharp. A video only pays off for what CSS can't draw (a lit 3D globe, particles).

## Watch out
The word is absolutely positioned off the globe's right edge, so the globe starts truly centred; the shift is measured from offsetLeft/offsetWidth (layout), because the word's own entry translate would skew getBoundingClientRect. If the face never loads the globe stays alone, and a 4 s race keeps a stalled reveal from holding the app.

In the code: index.html, the #wc-boot block (.wc-boot-lockup --wc-shift, wc-boot-spin keyframes, the inline script).
