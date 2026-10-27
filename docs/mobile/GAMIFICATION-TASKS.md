# Gamification and UX tasks

Source: the 2026-10-27 gamification and UX audit. Ranked by impact against
effort; do them in order. Rules in `NEXT-STEPS.md` still bind (engine
untouched, mobile layer only, text through `translateText()` with `en.json`
keys, every new module gets a test, no new dependencies).

Gate to move (from `PRODUCT.md`): at least 60% of players finish a game and at
least 40% start a second. No playtest data exists yet; do not invent any.

## Findings behind the tasks

1. PLAY led to a setup screen with about 25 options and the heaviest defaults
   (World, 400 tribes, 72 nations). The one-tap path was a small steel button.
2. Quick game asked for a difficulty on every start.
3. The tutorial shows "Step 1 of 22" in a Quick game, clips its text mid-sentence,
   and steps 15 to 22 teach silos and MIRVs a first game never reaches.
4. The 80% win share was shown nowhere, and early land reads "<0.1%".
5. The aftergame shows only VICTORY or DEFEAT and PLAY AGAIN: nothing about what
   the player did, so a loss teaches and rewards nothing (peak-end rule).
6. Progress across games is invisible: PlayStats only shows in About, the daily
   streak is one line on a button.
7. The event plate only ever alarms; no good moment is marked.

## Tasks

| #   | Task                                              | Impact        | Effort          | Status                   |
| --- | ------------------------------------------------- | ------------- | --------------- | ------------------------ |
| 0   | Funnel events (opt-in)                            | High          | Small           | Done (uncommitted)       |
| 1   | PLAY starts a quick game in one tap               | High          | Small           | Done (`abc2d86`)         |
| 2   | Land plate shows the 80% goal and a progress bar  | High          | Small           | Done (`abc2d86`)         |
| 3   | Aftergame recap and personal best                 | High          | Small to medium | Todo                     |
| 4   | Tutorial in chapters                              | High          | Medium          | Todo                     |
| 5   | Positive milestone plates                         | Medium        | Small           | Todo                     |
| 6   | Daily challenge: preview, best time, streak grace | Medium        | Small to medium | Todo                     |
| 7   | Commander record and map medals on home           | Medium        | Medium          | Todo                     |
| 8   | Earned commander titles                           | Low to medium | Small           | Todo                     |
| 9   | Map campaign ladder                               | High          | Large           | Blocked on playtest data |
| 10  | Resume recap line after catch-up                  | Low           | Small           | Todo                     |

### 0. Funnel events

Built (`src/client/mobile/Funnel.ts`, `PlayStats.ts`): opt-in `track()` events (`Analytics.ts`; consent and no-key rules already
apply, no PII): `spawn` (seconds since app open), `tutorial_step` (step id),
`game_end` gains land % and whether the player was alive, `second_game`
(a game started in the same app session after one ended). Done when the gate
can be read as a funnel: launch, spawn, 5 minutes, finish, second game.
Risk: keep it to these events; do not widen what is collected.

### 3. Aftergame recap and personal best

Under VICTORY or DEFEAT show time, peak land %, nations conquered (or "outlived
N of M bots"). Add one comparison line from `PlayStats` ("Your longest game
yet", best time per map) only when it is true; say nothing otherwise. Never
invent a best. Risk: hollow praise. Fits the 440px card at 640x320.

### 4. Tutorial in chapters

Three chapters: Expand (about 6 steps), Build (about 7), War (the rest). Counter
reads "Expand · 2 of 6". A first game teaches Expand only; later chapters open
when relevant (gold for a city, a coast, a silo). Show the first full sentence
instead of a mid-sentence clamp. Keep it in the mobile branch of
`TutorialPanel` (see `TOUCH_TEXT_STEPS`) so upstream merges stay cheap.

### 5. Positive milestone plates

Reuse `CriticalEventPlate` with a gold top edge: first nation conquered, 25%
and 50% of the land, rank #1, last rival left. Short haptic. Go through
`PlateGate` priority so a nuke always wins. Cap at a handful per game.

### 6. Daily challenge

Show today's map name and thumbnail on the button. Store a best time per daily.
Show a 7-day strip. One grace day per week. No "you'll lose your streak" copy.

### 7. Commander record on home

One plate under the name: wins, best time, maps conquered N/15, a medal per
curated map won. Replaces nothing; test at 640x320 with a save loaded.

### 8. Earned commander titles

Title under the name from the record ("Warlord of the Caucasus", "Unbroken").
Earned only, never bought.

### 9. Map campaign ladder

Order the 15 curated maps by difficulty, unlock each by winning the previous.
Needs real game lengths and win rates: build after the closed test. Every map
stays open in CUSTOM GAME.

### 10. Resume recap

After catch-up, one line before play: "Turn 4,200 · you're #2 with 31% of the
land."

## Left out on purpose

XP, levels and currencies (nothing to spend them on, non-monetized); loot
boxes and spin wheels; "don't lose your streak" pressure; confirmshaming copy;
badges for trivial actions. Push notifications need a Capacitor plugin (a new
dependency), so reasons to return stay inside the app.

## Open decisions

- First-time players get Medium without being asked. Easy may suit newcomers
  better (balance call, the owner's).
- Screenshots `04-quick-game` and the home shot in `docs/mobile/store/play/`
  show the old buttons; retake before submitting the listing.
