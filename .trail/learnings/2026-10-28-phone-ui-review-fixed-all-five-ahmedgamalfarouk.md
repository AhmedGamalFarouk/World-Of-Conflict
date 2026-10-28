---
title: "Phone UI review fixed all five findings; upstream inline styles beat mobile CSS and the debug build needs Android Studio's JDK"
author: AhmedGamalFarouk
date: 2026-10-28
branch: main
cost: { minutes: 9, tokens: 70712 }
id: l-0d9e6eb0
scope: repo
status: active
src: agent
touches:
  - src/client/hud/WeaponsButton.ts
  - src/client/mobile/mobile-theme.css
  - src/client/hud/layers/GameRightSidebar.ts
  - src/client/mobile/SaveHome.ts
  - resources/lang/en.json
  - DESIGN.md
---

## Decided
Fix all five findings from the on-device review (feed clipping, rank plate top alignment, save-card age and discard target, pause header, weapons button), starting with feed clipping and HUD alignment. Save age is shown as min/h/d, and the resume header drops the turn number.

## Tried and ruled out
Only fixing the top three issues, or re-testing first (font scale, TalkBack, frame timing): the user chose all five. Match timer counting during resume catch-up and low-contrast green feed text were left alone (timer is game code; colour is an upstream class).

## Watch out
- Upstream writes an inline margin-top on the left sidebar, which beats mobile CSS unless the rule uses !important.
- android:debug fails with WC_DOCTOR_JAVA unless JAVA_HOME points at Android Studio's jbr; the install step then silently reinstalls the OLD apk.
- Debug builds expose WebView devtools: adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>, then CDP Runtime.evaluate to read element rects.

In the code: src/client/mobile/mobile-theme.css, src/client/mobile/SaveHome.ts (agoText), src/client/hud/WeaponsButton.ts, src/client/hud/layers/GameRightSidebar.ts, resources/lang/en.json (save.ago_*).
