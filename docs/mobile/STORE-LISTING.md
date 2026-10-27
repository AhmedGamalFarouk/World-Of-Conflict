# Play Store listing copy (draft)

Paste into Play Console. "OpenFront" appears only as the licence credit; nothing
here claims more than the build does. Screenshots, the feature graphic and the
final mark are owner tasks (see NEXT-STEPS.md section 5).

## Text

- **App name** (30): `World Of Conflict`
- **Short description** (80): `Offline territory strategy on real maps. Expand, ally, and outlast the bots.`
- **Full description** (4000):

  ```
  World Of Conflict is a real-time strategy game about territory. Pick a real-world
  map, spawn, and grow your borders before the bots grow theirs. Tap a target to
  attack, hold to open the radial menu, build cities, ports and defences, make
  alliances, and watch the front line move.

  • Fully offline: no account, plays without a connection, no ads.
  • Quick game: a ready-made match in one tap, or tune the map, bots and difficulty.
  • 15 maps of real geography, from Europe to the whole World.
  • Built for landscape phones: a troop-ratio rail (25/50/75/100%), event alerts
    with optional vibration, and a pause card with a safe exit.
  • Your game is saved automatically. If the phone or the app gets interrupted,
    CONTINUE replays it where you left off.
  • A tutorial for first-time players.

  World Of Conflict is free and open source (AGPL-3.0). It is based on
  OpenFront.io, with art under CC BY-SA 4.0, and is not affiliated with or
  endorsed by OpenFront. Source: github.com/AhmedGamalFarouk/World-Of-Conflict
  ```

- **Privacy policy URL**: `https://ahmedgamalfarouk.github.io/World-Of-Conflict/privacy.html`
  (needs GitHub Pages on from `main` `/docs`)
- **Category**: Games > Strategy.
- **Contact**: the GitHub issues link and the owner's email.

## Declarations

- **Ads**: none. **In-app purchases**: none. **Target audience**: 13+ (war
  theme, no gore).
- **Content rating**: stylised strategy-map violence; no blood, gambling,
  user-generated content or chat. Answer the IARC questionnaire on that basis.
- **Data safety**: opt-in anonymous usage stats to Aptabase (off by default;
  builds without `WC_APTABASE_KEY` send nothing). Declare "App activity > App
  interactions" and "App info and performance > Crash logs / Diagnostics"
  (error codes only): collected = yes, shared = no, processed ephemerally = no,
  optional (user can choose) = yes, purpose = Analytics, encrypted in transit =
  yes. User can request deletion = no: there are no accounts and Aptabase
  cannot link events to a person (aptabase.com/legal/privacy: IP and user
  agent are processed in memory only, events kept up to 5 years).
- **Permissions**: `INTERNET` (the WebView, and the optional usage stats to
  Aptabase; otherwise no requests beyond `https://localhost`) and `VIBRATE` (event alerts).
- **Requirements**: Android 8.0 (minSdk 26), WebGL2-capable WebView, landscape.

## Assets (1920x1080, landscape) — `docs/mobile/store/play/`

Six screenshots and the 1024x500 feature graphic, composed 2026-10-26 from real
captures of the mobile build (Chrome at 1920x1080 on a real GPU, not a phone):
`01-conquer-the-real-world` (World map, HUD hidden), `02-out-expand-every-nation`
(late-game spectator view of a Europe game, after the scripted player was
eliminated), `03-tap-to-attack` (own territory and the 25/50/75/100 rail),
`04-quick-game` (difficulty picker), `05-pick-a-real-map` (map picker, Featured
tab) and `06-pick-up-where-you-left-off` (home with CONTINUE, a 3:00 save).
Headlines and claims stay within what the build does (offline, 15 maps, save and
resume). Set in Barlow Condensed on Night with Gold emphasis, as in `DESIGN.md`.

Not covered yet: an event plate shot ("Germany is attacking you" appears in a
game but was not caught cleanly), an aftergame screen, and a capture from a
phone. Shots 02 and 03 are the first to retake on the vivo when you have a
good mid-game of your own. The older emulator drafts in `docs/mobile/store/`
(`01-home` to `05-territory`, `feature-graphic`) are superseded.

App icon: the adaptive icon (replace `res/drawable/wc_mark.xml` first if the
final mark exists). Not generated here: the mark (B8) is still open.

## Closed test (new personal accounts)

12+ testers opted in for 14 continuous days before production access. Feedback
goes to GitHub issues with the pasted Copy error log. Turn on pre-launch reports
and recheck targetSdk at upload.
