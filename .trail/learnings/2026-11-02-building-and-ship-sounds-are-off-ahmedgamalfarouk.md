---
title: "Building and ship sounds are off by default behind one on/off setting, not a volume channel"
author: AhmedGamalFarouk
date: 2026-11-02
branch: main
cost: { minutes: 3, tokens: 72973 }
id: l-f8a1e697
scope: repo
status: active
src: agent
---

## Decided
The owner asked for building sounds and the transport-ship ("sending ship") sound to be off by default. They are gated by one on/off setting (default off) that the phone Sound section shows as a switch. The gate covers every build cue (city, port, defense post, factory, train station, SAM, silo, warship) plus transport-ship. Nukes, alerts, conquest, spawn, game start and victory/defeat are not affected.

## Tried and ruled out
A new mixer channel/volume slider for build sounds: the mixer category is a fixed function of the cue name and the channel set drives reset and legacy-migration logic, so adding a channel is a lot of code for what is just an on/off choice.

## Watch out
The gate is at emit time in the sound controller, so the train-station throttle still advances while the setting is off. "Reset sound" clears this setting too (back to off).

In the code:
- UserSettings.buildSounds()/toggleBuildSounds(), key settings.audio.buildSounds, listed in AUDIO_RESET_KEYS
- BUILD_SOUNDS set + check in SoundEffectController.emit; controller takes UserSettings as an optional 3rd constructor arg (tests pass a stub)
- Toggle wc-set-build-sounds in mobile/Settings.ts renderSound; strings mobile.settings_build_sounds(_desc) in en.json and ar.json
