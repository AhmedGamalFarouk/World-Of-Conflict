---
title: CI lint was failing on tool files and hiding a broken splash test behind it
author: AhmedGamalFarouk
date: 2026-11-06
branch: main
cost: { minutes: 31, tokens: 132801 }
id: l-321a9dcc
scope: repo
status: active
src: agent
touches:
  - docs/mobile/NEXT-STEPS.md
  - tests/client/MobileShell.test.ts
  - tests/client/mobile/ResumeCount.test.ts
  - index.html
  - resources/lang/ar.json
  - resources/lang/en.json
  - src/client/UserSettings.ts
  - src/client/controllers/SoundEffectController.ts
  - src/client/mobile/Settings.ts
  - tests/client/controllers/SoundEffectController.test.ts
---

## Decided
Lint skips the trail tool folder and the promo video folder. Both hold generated or vendored JavaScript that breaks the house rule preferring `??` over `||`, and neither ships in the app.
The launch-frame test now checks that Night (#0b1020) is the base colour under the splash glow, not the whole background, because the glow was added on purpose.

## Tried and ruled out
Rewriting the tool files to satisfy the rule: trail regenerates its hook and the promo scripts are vendored, so the edits would not survive.

## Watch out
CI runs lint before the tests, so a red lint step hides every test failure behind it. Main was red for two pushes, and the stale splash test only showed up once lint passed. When CI goes red, fix it at once and rerun the whole job before trusting the tests.

In the code:
- `.oxlintrc.json` ignorePatterns and `eslint.config.js` ignores: `.trail/**`, `promo/**`
- `tests/AndroidResources.test.ts`: regex `/#wc-boot\s*{[^}]*background:[^;]*#0b1020;/i`
- CI steps in `.github/workflows/ci.yml`: typecheck, then `lint:github`, then the targeted vitest list
