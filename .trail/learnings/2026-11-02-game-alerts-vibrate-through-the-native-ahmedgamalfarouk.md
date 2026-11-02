---
title: Game alerts vibrate through the native haptics plugin because Android drops WebView vibrations when touch feedback is off
author: AhmedGamalFarouk
date: 2026-11-02
branch: main
cost: { minutes: 7, tokens: 40513 }
id: l-eaead420
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/Haptics.ts
  - src/client/hud/GameRenderer.ts
---

## Decided
Event plates (attack, nuke, betrayal, milestone) vibrate through @capacitor/haptics; touch ticks (attack sent, radial slice) stay on navigator.vibrate so they follow the phone's touch-feedback switch, as Android players expect.

## Tried and ruled out
navigator.vibrate alone: Android files every WebView vibration as usage TOUCH, and with system touch feedback off (haptic_feedback_enabled=0) every one is dropped as ignored_for_settings. The app looked like it never vibrated though the code ran.

## Watch out
The plugin calls Vibrator.vibrate(effect) with no attributes, so Android files it as UNKNOWN, which played on the test phone with touch feedback off. Checked on a vivo V2529 on Android 16 only. Background apps' vibrations are still dropped (ignored_background), so verify with the app in front and the phone unlocked.
Also: adding a dependency with npm install prunes the --no-save Playwright the run-openfront skill needs; reinstall it with --no-save after.

In the code: src/client/mobile/Haptics.ts (vibrate vs vibrateAlert), src/client/hud/GameRenderer.ts plate onShown. Diagnose on device: `adb shell dumpsys vibrator_manager | grep worldofconflict` shows usage and ignored_* reason per vibration; `adb shell settings get system haptic_feedback_enabled`.
