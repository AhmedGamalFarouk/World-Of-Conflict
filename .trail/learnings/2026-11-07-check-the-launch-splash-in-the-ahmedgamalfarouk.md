---
title: "Check the launch splash in the mobile build, not the dev server"
author: AhmedGamalFarouk
date: 2026-11-07
branch: main
cost: { minutes: 1, tokens: 2467 }
id: l-51daa25e
scope: repo
status: active
src: agent
touches:
  - index.html
---

## Decided
The splash slides the globe aside for the wordmark only once the wordmark's font has loaded, because sliding without it left the globe off-centre with nothing beside it.

## Watch out
The dev server always shows the no-font case (globe alone), because there the font's stylesheet is injected by script after the splash has already asked for the font. Judge the splash from a mobile build served locally instead. Headless Chromium needs the machine's GPU, otherwise the game refuses to start (it rejects software WebGL).

In the code:
- `index.html`: `.wc-boot-font .wc-boot-lockup` and `.wc-boot-font .wc-boot-word` carry the slide and the word animations
- Build and serve: `npm run build-mobile`, then `npx vite preview --mode mobile --port 9100 --strictPort`
- Headless GPU: chromium args `--use-angle=d3d11 --ignore-gpu-blocklist --enable-gpu`
