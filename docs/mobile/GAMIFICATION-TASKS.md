# Gamification and UX tasks

Source: the 2026-10-27 gamification and UX audit. Ranked by impact against
effort; do them in order. Rules in `NEXT-STEPS.md` still bind (engine
untouched, mobile layer only, text through `translateText()` with `en.json`
keys, every new module gets a test, no new dependencies).

Gate to move (from `PRODUCT.md`): at least 60% of players finish a game and at
least 40% start a second. No playtest data exists yet; do not invent any.

## Start here (new session)

**State (2026-10-27):** tasks #0 to #3 are done and committed on `main`; #4
(tutorial in chapters) is done but not committed yet. Next up is **#5, positive
milestone plates**. `main` is ahead of `origin/main`: push only
when the owner says so.

| Commit    | What                                        |
| --------- | ------------------------------------------- |
| `abc2d86` | #1 PLAY one tap, #2 land plate goal and bar |
| `7666c32` | #0 funnel events, this task list            |
| `5e6abb6` | #3 aftergame recap                          |

**Code map (all mobile layer, `src/client/mobile/` unless noted):**

- `QuickGame.ts`: `startQuickGame`, `lastDifficulty`, `chooseQuickDifficulty`.
  `src/client/GameModeSelector.ts` holds the title buttons (`playOffline`,
  `customGameOffline`, `pickQuickDifficulty`, the `.wc-play-wrap` chip).
- `src/client/hud/layers/GameLeftSidebar.ts`: `landProgress()` (share and goal,
  measured like `WinCheckExecution`), the land plate, calls `trackSpawn` and
  `notePeakLand` each second.
- `Funnel.ts` (`trackSpawn`, `trackTutorialStep`, `landPercent`), `PlayStats.ts`
  (`gameStarted` sends `second_game`, `gameEnded` takes a land %).
- `Recap.ts` (`recordGame`, `rivalCount`, `notePeakLand`, bests in
  `localStorage["wc.best"]`), rendered by `WinModal.ts` `renderRecap()`.
- `DailyChallenge.ts`, `SaveHome.ts`, `CriticalEventPlate.ts` (for #5, #6, #10).
- Styles: `mobile-theme.css` (scoped under `body.mobile-theme`); `DESIGN.md` is
  the UI authority and was updated for #1 and #2 (update it for any new plate).

**Gotchas learned:**

- At 640x320 everything must fit. In `mobile-theme.css`, a `@media` block placed
  _before_ the base rule loses (same specificity, source order decides): put
  compact rules after the base rules.
- HUD text at least 14px, numbers at least 16px, touch targets at least 48px.
- Text keys: add to `resources/lang/en.json` in alphabetical order within the
  block, and to `resources/lang/ar.json` (hand-edited, machine-drafted, same
  `{placeholders}`). Delete a key you stop using (`TranslationSystem` test).
- Known failures on clean `main`, not yours: `tests/EnJsonSorted.test.ts`
  (`build_menu` order) and `tests/TranslationSystem.test.ts` (unused
  `build_menu.desc_short.*`). Everything else in `tests/client/mobile` passes.
- Run targeted tests only (`npx vitest run tests/client/mobile tests/GameLeftSidebar.test.ts`),
  then `npm run typecheck`, `npx eslint <files>`, `npx prettier --check <files>`.
  Not the 10-minute full suite.
- Preview: `preview_start` config `mobile-preview` (port 9100, serves
  `dist-mobile/`); rebuild with `npm run build-mobile` after each change, add
  `?v=N`, resize to 640x320. Drive buttons with `javascript_tool`
  `element.click()` (screenshot coordinates are scaled). A game left behind
  autosaves, so the next PLAY shows the discard dialog (`.wc-destroy` taps it).
  To see the aftergame without finishing a game: after spawning, run
  `document.querySelector('win-modal').isWin = true; await ....show()`.
  Screenshots of the game page can come back stale; measure with
  `getBoundingClientRect` as well. Stop the server and reset the viewport after.
- Hooks flag some upstream lines in `GameModeSelector.ts` (gray on colour); they
  are not ours, leave them.

## Findings behind the tasks

1. PLAY led to a setup screen with about 25 options and the heaviest defaults
   (World, 400 tribes, 72 nations). The one-tap path was a small steel button.
2. Quick game asked for a difficulty on every start.
3. The tutorial shows "Step 1 of 22" in a Quick game, clips its text mid-sentence,
   and steps 15 to 22 teach silos and MIRVs a first game never reaches.
4. The 80% win share was shown nowhere, and early land reads "<0.1%".
5. The aftergame showed only VICTORY or DEFEAT and PLAY AGAIN: nothing about what
   the player did, so a loss taught and rewarded nothing (peak-end rule).
6. Progress across games is invisible: PlayStats only shows in About, the daily
   streak is one line on a button.
7. The event plate only ever alarms; no good moment is marked.

## Tasks

| #   | Task                                              | Impact        | Effort          | Status                   |
| --- | ------------------------------------------------- | ------------- | --------------- | ------------------------ |
| 0   | Funnel events (opt-in)                            | High          | Small           | Done (`7666c32`)         |
| 1   | PLAY starts a quick game in one tap               | High          | Small           | Done (`abc2d86`)         |
| 2   | Land plate shows the 80% goal and a progress bar  | High          | Small           | Done (`abc2d86`)         |
| 3   | Aftergame recap and personal best                 | High          | Small to medium | Done (`5e6abb6`)         |
| 4   | Tutorial in chapters                              | High          | Medium          | Done (uncommitted)       |
| 5   | Positive milestone plates                         | Medium        | Small           | **Next**                 |
| 6   | Daily challenge: preview, best time, streak grace | Medium        | Small to medium | Todo                     |
| 7   | Commander record and map medals on home           | Medium        | Medium          | Todo                     |
| 8   | Earned commander titles                           | Low to medium | Small           | Todo                     |
| 9   | Map campaign ladder                               | High          | Large           | Blocked on playtest data |
| 10  | Resume recap line after catch-up                  | Low           | Small           | Todo                     |

## Done

### 0. Funnel events (`7666c32`)

Opt-in events (`Analytics.ts`; consent and no-key rules apply, no PII):
`spawn` (seconds since app open, once per game), `tutorial_step` (step id, each
step once as it first shows), `second_game` (once per install, when
`PlayStats.started` reaches 2), and `game_end` now carries `land` (final whole
percent, 0 if eliminated). Tests: `tests/client/mobile/Funnel.test.ts`.
Not done: the events have not been seen arriving at Aptabase, and the in-app
consent text ("modes and maps you play, how games end, error codes") does not
name tutorial progress; consider adding it. `docs/privacy.html` lists no
individual events.

### 1 and 2. PLAY and land plate (`abc2d86`)

PLAY starts a quick game at the remembered difficulty; the difficulty is a chip
on the PLAY face that opens the picker and starts nothing; QUICK GAME became
CUSTOM GAME (full setup). Every start still asks before replacing a save. The
land plate shows LAND, GOAL (the winning share, drops in overtime) and a gold
bar toward it. Tests in `StartEntries`, `QuickDifficulty`, `GameLeftSidebar`.

### 3. Aftergame recap (`5e6abb6`)

Time, peak land %, nations out (nations only, not tribes), and at most one
comparison line per map: first win, fastest win, longest game, most land. Only
when true, nothing on a first game on a map. Bests are since this shipped, not
all time. Known ceiling: peak land restarts if a game is resumed after an app
restart. Compact layout for 640x320 (card 243px). Tests: `Recap.test.ts`.

### 4. Tutorial in chapters (uncommitted)

Mobile only (`TutorialChapters.ts`; `Tutorial.ts` untouched, desktop keeps the
22-step flow). Expand (6 steps, spawn to tribes), Build (8, City to port info),
War (8, Defense Post to SAM). One chapter per game, the first unfinished one
(`localStorage["wc.tutorial"]` = chapters done); Build opens once a City is
affordable, War once a Missile Silo is. The heading reads "EXPAND · 2 OF 6";
the body shows the first sentence whole, a chevron and a tap show the rest. A
finished chapter that isn't the last closes for the game, it does not set
`tutorialDismissed`. Tests: `TutorialChapters.test.ts`. Not checked in the
640x320 preview (no browser in that session): check the banner height with a
long first sentence (`capture_tribes` runs to about four lines at 260px).
Known ceiling: when no step of a chapter applies (every War unit disabled),
"chapter done" shows for 5s with nothing taught.

## Remaining

### 5. Positive milestone plates (next)

Reuse `CriticalEventPlate` with a gold top edge: first nation conquered, 25%
and 50% of the land, rank #1, last rival left. Short haptic (`Haptics.ts`). Go
through `PlateGate` priority so a nuke always wins. Cap at a handful per game,
once each. `landProgress()` and `rivalCount()` already give the inputs. Update
`DESIGN.md` "Event Plate" (it says Alarm Red only; gold is a new variant).

### 6. Daily challenge

Show today's map name and thumbnail on the button. Store a best time per daily.
Show a 7-day strip. One grace day per week. No "you'll lose your streak" copy.
Starts in `DailyChallenge.ts` (`dailyStatus`, `dailyEnded`, `wc.daily`). The
title button is `.wc-daily` in `GameModeSelector.ts`; check 640x320 with a save.

### 7. Commander record on home

One plate under the name: wins, best time, maps conquered N/15, a medal per
curated map won (`CuratedMaps.ts`; `wc.best` from `Recap.ts` already holds the
per-map win time). Replaces nothing; test at 640x320 with a save loaded (the
title screen already runs out of room there).

### 8. Earned commander titles

Title under the name from the record ("Warlord of the Caucasus", "Unbroken").
Earned only, never bought.

### 9. Map campaign ladder (blocked)

Order the 15 curated maps by difficulty, unlock each by winning the previous.
Needs real game lengths and win rates: build after the closed test. Every map
stays open in CUSTOM GAME.

### 10. Resume recap

After catch-up, one line before play: "Turn 4,200 · you're #2 with 31% of the
land." Catch-up state is in `SaveStore.ts` / the pause card (`GameRightSidebar.ts`).

## Left out on purpose

XP, levels and currencies (nothing to spend them on, non-monetized); loot
boxes and spin wheels; "don't lose your streak" pressure; confirmshaming copy;
badges for trivial actions. Push notifications need a Capacitor plugin (a new
dependency), so reasons to return stay inside the app.

## Open decisions (owner)

- First-time players get Medium without being asked. Easy may suit newcomers
  better (balance call).
- "Nations out" in the recap excludes tribes; counting everyone gave readings
  like 3/472 in a custom game.
- Screenshots `04-quick-game` and the home shot in `docs/mobile/store/play/`
  show the old buttons; retake before submitting the listing.
- Nothing from this work has been tried on a phone; the checks were the 640x320
  browser preview and unit tests.
