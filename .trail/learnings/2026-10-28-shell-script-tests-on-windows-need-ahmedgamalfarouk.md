---
title: Shell-script tests on Windows need jq installed and Git Bash style paths
author: AhmedGamalFarouk
date: 2026-10-28
branch: main
cost: { minutes: 7, tokens: 89244 }
id: l-04c2f448
scope: repo
status: active
src: agent
touches:
  - resources/lang/en.json
  - src/client/GameModeSelector.ts
  - src/client/hud/WeaponsButton.ts
  - src/client/hud/layers/GameRightSidebar.ts
  - src/client/mobile/SaveHome.ts
  - src/client/mobile/mobile-theme.css
  - tests/TranslationSystem.test.ts
  - tests/UpdateRegister.test.ts
  - tests/UpdateFlagLatest.test.ts
  - update.sh
---

## Decided
The update.sh tests run real bash against a fake curl. On Windows they need jq on PATH and any temp path written into a script must be in the /c/... form.

## Tried and ruled out
Installing jq alone: tests still failed because the fake curl dir was written as a C:\ path, so Git Bash never found it and ran the real curl.

## Watch out
The first `bash` on this machine's Windows PATH is WSL's broken one; Git Bash only wins when spawned from a Git Bash shell. The RewardTrack and MainInitialize client tests time out at 5s under full-suite load but pass alone.

In the code:
- tests/UpdateRegister.test.ts and tests/UpdateFlagLatest.test.ts: `sh()` helper converts paths
- `scoop install jq shellcheck`
