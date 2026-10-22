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

  • Fully offline: no account, no connection, no ads.
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
- **Data safety**: collects no data, shares none. Nothing leaves the device.
- **Permissions**: `INTERNET` (the WebView; the app makes no requests beyond
  `https://localhost`) and `VIBRATE` (event alerts).
- **Requirements**: Android 8.0 (minSdk 26), WebGL2-capable WebView, landscape.

## Assets to capture (1920x1080, landscape)

1. Home with CONTINUE visible.
2. Mid-game territory on Europe.
3. Event plate (an attack or a nuke warning).
4. QUICK GAME start screen.
5. Aftergame screen.

Feature graphic: 1024x500. App icon: the adaptive icon (replace
`res/drawable/wc_mark.xml` first if the final mark exists).

## Closed test (new personal accounts)

12+ testers opted in for 14 continuous days before production access. Feedback
goes to GitHub issues with the pasted Copy error log. Turn on pre-launch reports
and recheck targetSdk at upload.
