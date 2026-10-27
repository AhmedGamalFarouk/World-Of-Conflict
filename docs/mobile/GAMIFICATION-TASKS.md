# Gamification and UX tasks

Source: the 2026-10-27 gamification and UX audit. Ranked by impact against
effort; do them in order. Rules in `NEXT-STEPS.md` still bind (engine
untouched, mobile layer only, text through `translateText()` with `en.json`
keys, every new module gets a test, no new dependencies).

Gate to move (from `PRODUCT.md`): at least 60% of players finish a game and at
least 40% start a second. No playtest data exists yet; do not invent any.

## Start here (new session)

**State (2026-10-27):** every task but #9 is done and pushed to
`origin/main`; #9 waits for playtest data. Checked on a phone (vivo V2529,
870x392 CSS px, debug APK driven over WebView DevTools): the home screen with a
save, the record plate and daily strip (sample data, removed after), the pause
card's standing line after a real resume, the milestone plate, the tutorial
chapter banner. Fixed from that: the short title layout now applies up to 430px
tall (at 340px it never reached a phone), the event plate is opaque, the
weapons button moves below the tutorial banner (it covered the step text), and
the About button is a centred line icon. Not yet seen on a device: a whole first
game with the tutorial live, a milestone firing in play.

| Commit    | What                                        |
| --------- | ------------------------------------------- |
| `abc2d86` | #1 PLAY one tap, #2 land plate goal and bar |
| `7666c32` | #0 funnel events, this task list            |
| `5e6abb6` | #3 aftergame recap                          |
| `21baf01` | #4 tutorial in chapters                     |
| `338d77f` | #5 milestone plates                         |
| `cd39cc0` | #6 daily challenge                          |
| `02cd9f7` | #7 record, #8 titles, #10 resume standing   |
| `c1ae8b6` | Title layout up to 430px tall (device)      |
| `e20c1ec` | Weapons button clears banner, opaque plate  |
| `4a1f421` | About button centred icon                   |

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

- Everything must fit at 640x320 and at a real phone's height (360px to 412px;
  the short-screen query is `max-height: 430px`). In `mobile-theme.css`, a `@media` block placed
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
| 4   | Tutorial in chapters                              | High          | Medium          | Done (`21baf01`)         |
| 5   | Positive milestone plates                         | Medium        | Small           | Done (`338d77f`)         |
| 6   | Daily challenge: preview, best time, streak grace | Medium        | Small to medium | Done (`cd39cc0`)         |
| 7   | Commander record and map medals on home           | Medium        | Medium          | Done (`02cd9f7`)         |
| 8   | Earned commander titles                           | Low to medium | Small           | Done (`02cd9f7`)         |
| 9   | Map campaign ladder                               | High          | Large           | Blocked on playtest data |
| 10  | Resume recap line after catch-up                  | Low           | Small           | Done (`02cd9f7`)         |

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

### 4. Tutorial in chapters (`21baf01`)

Mobile only (`TutorialChapters.ts`; `Tutorial.ts` untouched, desktop keeps the
22-step flow). Expand (6 steps, spawn to tribes), Build (8, City to port info),
War (8, Defense Post to SAM). One chapter per game, the first unfinished one
(`localStorage["wc.tutorial"]` = chapters done); Build opens once a City is
affordable, War once a Missile Silo is. The heading reads "EXPAND · 2 OF 6";
the body shows the first sentence whole, a chevron and a tap show the rest. A
finished chapter that isn't the last closes for the game, it does not set
`tutorialDismissed`. Tests: `TutorialChapters.test.ts`. Seen on the phone (paused game, panel
stepped by hand): "EXPAND · 2 OF 6" and the first sentence fit in a 68px
banner; the weapons button now moves below it.
Known ceiling: when no step of a chapter applies (every War unit disabled),
"chapter done" shows for 5s with nothing taught.

### 5. Positive milestone plates (`338d77f`)

`CriticalEventPlate` gained a `milestone` kind (gold top edge and star, 15ms
haptic): first nation conquered (by you, from `ConquestEvent`, not tribes), a
quarter and half of the land, largest nation, one rival left. Checked once a
second after the spawn phase; each once per game, so five at most. Shows only
on an empty slot and any alarm replaces it (`PlateGate`). Milestones already
reached when a resume goes live never show. Tests in
`CriticalEventPlate.test.ts`. Look checked on the phone (rendered by hand, not
fired in play); the plate is now opaque. Known ceiling: after a resume, "you conquered" shows at your next
nation conquest even if it was not your first.

### 6. Daily challenge (`cd39cc0`)

The DAILY button shows today's map (thumbnail and name), the last 7 days as
dots, and the streak or, once played today, the day's best time
(`DailyDay.best`, the fastest win of that day, replays included; the first
result still decides the streak and `daily_end`). One missed day per 7 is
forgiven: it doesn't count and doesn't break the run, so opening the app the
day after a miss still shows the streak. Copy never warns about losing it.
Tests in `DailyChallenge.test.ts`. Seen on the phone with a save and sample
history: two lines (16px name, 14px dots and status) fit in 44px.

### 7 and 8. Commander record and titles (`02cd9f7`)

A record plate under the name (`GameModeSelector.renderRecord`, data from
`Recap.commanderRecord`): title, WINS, BEST (fastest win anywhere), MAPS N/15,
a medal per curated map won. Hidden before the first finished game. `wc.best`
now counts `wins` per map; older records with a win time count as one win.
Titles, highest first: World Conqueror (every curated map), Warlord of {map}
(3 wins on one map), Unbroken (daily streak of 7), Victor (any win). Earned
only. Tests in `Recap.test.ts`. Seen on the phone with a save and sample records:
on screens up to 430px tall the plate takes a third row in the left column,
under the name, and the page still fits 392px.

### 10. Resume recap (`02cd9f7`)

Once a resumed game has caught up, the pause card's catch-up line becomes
"You're #2 with 31% of the land" (rank by land among the living, share from
`landProgress`). The turn was already in the RESUMED header. Test in
`AboutAndPauseCard.test.ts`. Seen on the phone after a real resume ("You're #4
with 14% of the land").

## Remaining

### 9. Map campaign ladder (blocked)

Order the 15 curated maps by difficulty, unlock each by winning the previous.
Needs real game lengths and win rates: build after the closed test. Every map
stays open in CUSTOM GAME.

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
- Still untested on a device: a whole first game with the tutorial live, a
  milestone firing in play. The funnel events have not been seen arriving at
  Aptabase.
