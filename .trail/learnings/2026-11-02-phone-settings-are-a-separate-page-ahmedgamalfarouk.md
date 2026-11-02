---
title: Phone settings are a separate page body; web and desktop settings are not offered on the phone
author: AhmedGamalFarouk
date: 2026-11-02
branch: main
cost: { minutes: 13, tokens: 233291 }
id: l-ad9606ac
scope: repo
status: active
src: agent
touches:
  - src/client/mobile/Settings.ts
  - tests/client/mobile/Settings.test.ts
---

## Decided
On the mobile shell, <user-setting> shows its own body (sections Battle, Sound, Display, App) in place of upstream's tabs. The web build keeps upstream's tabs. Kept: send ratio (shown as the four rail stops), ally nuke lock, start on your nation, hints, troops on front lines, nation emojis, vibration, six volumes, map style (Standard / Night / Colour-blind presets), red alert edge, advanced graphics (upstream's component, behind a switch), language (title screen only), usage stats, performance readout, About.

## Tried and ruled out
- Mute on blur and alerts-when-unfocused: AudioMixer already suspends the AudioContext when the app goes to the background, so they do nothing.
- Tap opens menu and left-click menu: the owner fixed tap = attack and long-press = radial.
- Cursor cost label, attack ratio increment, keybinds: they need a cursor, a keyboard or a scroll wheel.
- Anonymous names, lobby IDs, lobby start alerts, replay viewer, Steam links: online or desktop only.
- HUD opacity: the phone's plates don't read --hud-opacity.
- Graphics import/export and "Evan's Pick": niche on a phone, and the preset name means nothing to players.

## Watch out
- The stored attack ratio defaults to 20%, which is not a rail stop. ControlPanel snaps it to the nearest stop (higher on a tie), and the settings row shows the same snap. Keep the two in step.
- Both settings instances (#page-settings and #game-settings) render the body, so ids repeat in the DOM. Tabs use data-section, not ids. Scope queries to #page-settings.
- The shared .wc-seg grid assumes four options; settings rows override it to auto columns.

In the code: src/client/mobile/Settings.ts, UserSettingModal.modalConfig/renderBody (isMobileShell branch), LangSelector.openModal (now public), mobile-theme.css "Settings" block, strings under mobile.settings_* in en.json and ar.json.
