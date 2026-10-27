---
name: World Of Conflict
description: Mobile layer for the offline Android build of OpenFront. Armoured night-navy plates and struck-gold controls framing an untouched battlefield.
colors:
  night: "#0b1020"
  plate: "#141b2d"
  plate-hi: "#1e2842"
  steel: "#2a3555"
  steel-face-top: "#303d61"
  steel-face-bottom: "#1c2540"
  gold: "#e8b24a"
  gold-hi: "#f6d27a"
  gold-face-top: "#f3c860"
  gold-face-bottom: "#d99b2b"
  gold-rim: "#f7dc8f"
  gold-ink: "#2a1a04"
  gilt-hairline: "rgb(232 178 74 / 0.5)"
  line: "rgb(255 255 255 / 0.09)"
  troop-blue: "#4a9be8"
  alarm-red: "#e5484d"
  growth-green: "#3dbe7a"
  ember: "#f0a04b"
  ivory: "#ece8df"
  mute: "#a9b3c7"
  battlefield-ground: "#262626"
typography:
  wordmark:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "clamp(64px, 19vh, 128px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.06em"
  title:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "0.12em"
  numeral-hero:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "tnum, lnum"
  numeral:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.01em"
    fontFeature: "tnum, lnum"
  button:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    letterSpacing: "0.06em"
  label:
    fontFamily: "Barlow Condensed, Barlow, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: "0.08em"
  body:
    fontFamily: "Barlow, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  bar: "3px"
  stop: "7px"
  chip: "8px"
  plate: "10px"
  menu: "12px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.plate}"
    padding: "0 20px"
    height: "48px"
  button-steel:
    backgroundColor: "{colors.steel-face-top}"
    textColor: "{colors.ivory}"
    typography: "{typography.button}"
    rounded: "{rounded.plate}"
    padding: "0 20px"
    height: "48px"
  button-play:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.plate}"
    height: "72px"
  plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.plate}"
  timer-plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.ivory}"
    typography: "{typography.numeral}"
    rounded: "{rounded.plate}"
    padding: "0 12px"
    height: "48px"
  rail-stop:
    backgroundColor: "{colors.line}"
    textColor: "{colors.mute}"
    rounded: "{rounded.stop}"
  rail-stop-on:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.gold-ink}"
    rounded: "{rounded.stop}"
  skip-chip:
    backgroundColor: "{colors.steel-face-top}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.chip}"
    padding: "0 10px"
    height: "32px"
---

# Design System: World Of Conflict

## Overview

**Creative North Star: "The War Table, Armoured"**

The mobile strategy-game category standard played straight at Supercell finish: dark armoured plates sit on the edges of a bright battlefield, gold marks what you press and what you spend, and every control is chunky enough to feel struck under a thumb. The battlefield owns the middle of the screen; chrome holds the corners and the right edge and nothing else.

Scope is the mobile layer only. Every rule here lives under `body.mobile-theme`, which only the mobile build turns on (through `src/client/mobile/OfflineGuard.ts`). The web client keeps upstream's look, and the WebGL battlefield renders exactly as upstream does: in-game the page ground goes back to upstream's Battlefield Ground. The layer reaches upstream components two ways: by remapping upstream's Tailwind tokens (the blue accent becomes gold, the surfaces become night plates, the blue glows become plain dark drop shadows) and by `wc-*` plates and buttons in the few components the mobile shell renders itself.

The platform is web UI inside an Android System WebView (Capacitor), locked to landscape, down to 640x320 CSS px, with the system bars hidden. It rejects the desktop web-app look the fork inherited (thin outlines, blue links, floating text clusters) and it rejects cartoon softness.

**Key Characteristics:**

- Night-navy plates with a warm-gold hairline and a lit top edge.
- Two button metals only: struck gold (primary) and steel navy (secondary), each with a lower lip that compresses on press.
- Condensed uppercase display type for titles, buttons, labels and every number; numbers are tabular.
- Anchored HUD: rank top-left, timer and pause top-right, economy bottom-left, send rail on the right edge.
- Touch first: targets of at least 48px, text of at least 14px, numbers of at least 16px, safe-area insets on every edge plate.

## Colors

A night-and-gold palette: deep navy plates carry the UI, gold is the one accent, and three state colours carry meaning on the battlefield HUD.

### Primary

- **Struck Gold** (gold): the accent. Primary buttons, the selected rail stop, the focus ring, text caret, selection tint, and the "OF" in the wordmark. Drawn on buttons as a face gradient from Gold Face Top to Gold Face Bottom with a Gold Rim border.
- **Gold Leaf** (gold-hi): gold read as a value. The gold count, the send-ratio value, the win title and the tutorial chevron.
- **Gold Ink** (gold-ink): the only text colour allowed on gold faces.
- **Gilt Hairline** (gilt-hairline): the 1px border of every plate, plate button and modal header rule.

### Secondary

- **Steel Navy** (steel-face-top to steel-face-bottom): the secondary button metal, with a white-14% border. Also the Skip chip and the modal back button. Steel (steel) itself is used for scrollbars.

### Tertiary (HUD state)

- **Troop Blue** (troop-blue): troops on hand in the economy bar.
- **Growth Green** (growth-green): a rising troop rate and the gold-gain pop.
- **Ember** (ember): a falling troop rate and the committed share of the economy bar.
- **Alarm Red** (alarm-red, `--wc-red` #e5484d): only the critical event plate's top edge and icon. Never a button, a chip or a general error colour.

### Neutral

- **Night** (night): the app ground on the home and setup screens, the Android window background, splash ground and Capacitor background, so the WebView never flashes white.
- **Plate** (plate) and **Plate High** (plate-hi): plate fills (plates are drawn as a top-lit gradient from Plate High down to a deeper #101626, at 95% opacity) and the hovered or selected row in the in-game menu.
- **Ivory** (ivory): default text. Pure white is reserved for the hero numerals (troop count, rank).
- **Mute** (mute): labels, unlit rail stops and the aftergame subtitle.
- **Line** (line): inner dividers, such as the rule between troops and gold, and rail stop borders.
- **Battlefield Ground** (battlefield-ground): upstream's in-game page ground, kept so the battlefield looks the same as upstream.

### Named Rules

**The Gold Is Pressed Rule.** Gold faces mean "press this" or "this is selected": one gold button per decision group (PLAY, RESUME, PLAY AGAIN, the active speed, the lit rail stop, the pause button). Everything else in the group is steel.

**The Ink On Gold Rule.** Text and icons on a gold face are Gold Ink; icon images on gold are flattened to ink (`brightness(0) opacity(0.82)`).

## Typography

**Display Font:** Barlow Condensed 600/700/800 (with Barlow, sans-serif)
**Body Font:** Barlow 500/600/700 (with sans-serif)

Both are self-hosted through the `@fontsource` packages: the app runs offline and its content security policy blocks Google Fonts.

**Character:** A condensed grotesque cut for scoreboards: tall, tight, uppercase and loud in the display roles, with its own regular width for the few sentences the UI holds.

### Hierarchy

- **Wordmark** (800, clamp(64px, 19vh, 128px), 0.86): the title screen only, stacked WORLD / OF / CONFLICT, uppercase with a soft dark drop shadow. "OF" is set at 0.34em, letter-spaced 0.32em, in Struck Gold.
- **Headline** (800, 40px, 1, 0.06em): the aftergame VICTORY or DEFEAT title.
- **Title** (800, 24px to 30px, 0.08em to 0.12em, uppercase): PAUSED, modal headers (26px) and the in-game menu header (24px).
- **Numeral Hero** (700, 34px, tabular lining): the troop count, the largest number on screen.
- **Numeral** (700, 16px to 24px, tabular lining): gold (24px), send value (24px), timer and rank (22px), troop rate and rail troops (16px). Never under 16px.
- **Button** (700, 18px, 0.06em, uppercase): standard buttons. Large calls step up: PLAY 30px at 0.12em, modal primary buttons 22px (800, 0.1em), solo START 26px, RESUME 24px, PLAY AGAIN 26px. Grids of four or two drop to 16px.
- **Label** (600, 14px, 0.08em, uppercase, Mute): the word that names an adjacent number or control group (TROOPS, GOLD, SEND, LAND, GAME SPEED).
- **Body** (Barlow 500, 14px to 16px, 1.3): tutorial text (14px) and subtitles (16px).

### Named Rules

**The Numbers Are Display Rule.** Every number on the HUD is Barlow Condensed 700 with tabular lining figures, so counts do not jitter as they tick.

**The Label Names A Number Rule.** A Label always sits with the value or control it names. It is never a free-standing heading above prose.

## Layout

Landscape only, designed at 844x390 and holding down to 640x320 CSS px. Every edge-anchored element adds the matching `env(safe-area-inset-*)` to its offset.

- **Title screen:** a two-column grid (1.15fr / 1fr, 40px column gap). The wordmark owns the left column, centred vertically; the commander name sits above the actions on the right (both at most 360px wide, 12px between actions). On screens 340px tall or less it moves under the wordmark, so the save card, PLAY, DAILY CHALLENGE, CUSTOM GAME and TUTORIAL fit in the right column. PLAY starts a quick game in one tap; its label sits left and the remembered difficulty sits on the right of the same face as a 48px chip (a sibling button) that opens the picker and starts nothing. CUSTOM GAME opens the full solo setup. The language flag, help and settings sit top-right as 48px round plate buttons. The backdrop is the World map thumbnail, desaturated (0.7), blurred 1.5px and fading into Night.
- **Solo setup:** settings scroll on the left; START holds a 232px right rail behind a Gilt Hairline so it never scrolls away. Map thumbnails run three to a row (10px gap).
- **In-game HUD:** a rank plate top-left (48px high) with your land share, LAND over GOAL (the winning share, which drops in overtime) and a 3px gold bar along its bottom edge for progress toward the goal; the tutorial banner top-centre (at most 420px wide, kept clear of the corners); timer and pause top-right (48px high); the economy plate bottom-left (at least 248px wide); the send rail on the right edge (64px wide, from 72px below the top to 12px above the bottom). The event feed pads 88px on the right to stay clear of the rail. The middle stays battlefield.
- **Overlays:** pause and aftergame are centred cards (at most 420px and 440px wide, 32px less than the viewport at most) on a scrim.
- **Rhythm:** 8px between sibling buttons, 12px between stacked actions and HUD edge offsets, 16px page padding, 4px and 2px inside numeric stacks.

## Elevation & Depth

Depth is physical rather than ambient: plates are lit from above (a 1px white inner highlight on the top edge) and sit on short, dark drop shadows. Buttons add a darker lower lip (an inner bottom shadow) that shrinks from 3px to 1px on press. There are no coloured glows; the gold win title is the one exception, with a soft gold text glow.

### Shadow Vocabulary

- **Plate** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.08), 0 4px 10px rgb(0 0 0 / 0.45)`): every HUD plate and card.
- **Gold button at rest** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.5), inset 0 -3px 0 rgb(120 70 10 / 0.55), 0 3px 8px rgb(0 0 0 / 0.45)`).
- **Gold button pressed** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 -1px 0 rgb(120 70 10 / 0.55), 0 1px 3px rgb(0 0 0 / 0.45)`).
- **Steel button at rest** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 -3px 0 rgb(0 0 0 / 0.35), 0 3px 8px rgb(0 0 0 / 0.4)`), pressed to a 1px lip in the same way.
- **Menu** (`box-shadow: 0 8px 24px rgb(0 0 0 / 0.55)`): the in-game menu panel.
- **Scrim** (`background: rgb(6 9 18 / 0.62); backdrop-filter: blur(3px)`): behind pause and aftergame cards.

### Named Rules

**The Struck Plate Rule.** A press moves the control down 2px over 90ms and shrinks its lower lip to 1px. Nothing scales and nothing glows.

## Shapes

Firm, slightly softened rectangles. Plates, buttons and plate buttons share one 10px corner; the in-game menu panel takes 12px, rail stops 7px, chips 8px and the economy bar 3px. Utility buttons on the title screen (flag, help, settings) are 48px circles. Every plate is bordered by a 1px Gilt Hairline; steel buttons use a 1px white-14% border; gold faces use a 1px Gold Rim.

## Components

### Buttons

Chunky and metallic; they read as objects to press, not links.

- **Shape:** 10px corners, at least 48x48px, 20px side padding, 8px icon gap, 22px icons.
- **Gold (primary):** a vertical gradient from Gold Face Top to Gold Face Bottom, a Gold Rim border, Gold Ink text in the Button style. Upstream's primary `o-button` is restyled to the same face at 56px high.
- **Steel (secondary):** a vertical gradient from Steel Face Top to Steel Face Bottom, a white-14% border, Ivory text.
- **Press / Disabled:** see The Struck Plate Rule. Disabled buttons are greyed (`grayscale(0.8) brightness(0.7)`) and do not move.
- **Focus:** a 2px Struck Gold outline, offset 2px, on every focusable element.
- **Hero sizes:** PLAY 72px high; solo START 72px; PLAY AGAIN 64px; RESUME 60px.

### Chips

- **Skip chip:** in the tutorial banner, a 32px steel chip with 8px corners replaces upstream's underlined link.

### Cards / Containers

- **Plate:** a top-lit gradient from Plate High to #101626 at 95% opacity, a Gilt Hairline, 10px corners, the Plate shadow and Ivory text.
- **Pause card and aftergame card:** plates on the scrim with 18px to 22px padding, 10px to 12px gaps, rising in (8px, 220ms to 260ms).
- **In-game menu:** the same plate gradient at 98%, 12px corners, the Menu shadow, 56px rows.

### Inputs / Fields

- **Commander name:** on the title screen, a plate field at least 52px high with a Gilt Hairline, 10px corners and Plate at 85% opacity, set in Barlow Condensed 700 at 20px. The caret is Struck Gold.

### Navigation

- **Modal header:** a top-lit gradient strip with a Gilt Hairline underneath, a 48px steel back button, and a Title in display caps (26px, 800, 0.08em).
- **Android back:** handled by the shell; there is no on-screen browser chrome.

### Send Rail (signature)

The control a player touches all game. A 64px plate on the right edge: the value on top (Numeral, Gold Leaf, with a 14px percent sign), the SEND label, four stacked stops (100/75/50/25) that fill the height, and the troops to send at the bottom. Stops below the selection tint to gold at 18%; the selected stop is a gold face with a 2px lower lip. Dragging snaps through the stops (`touch-action: none`).

### Economy Plate (signature)

Bottom-left. Troops on the left (the TROOPS label with its icon, the Numeral Hero count in white, the rate in Growth Green or Ember, and a 6px bar of troops on hand in Troop Blue against committed troops in Ember), then a Line divider, then gold in Gold Leaf. Gold gains pop above in Growth Green.

### Event Plate

Top-centre, `min(420px, 100vw - 380px)` wide so it clears the rank and timer plates at 640px, 12px plus the safe area from the top, or directly below the Tutorial Banner while that shows. A plate with a 2px Alarm Red top edge, a 22px line icon in Alarm Red per event (radiation mark, broken link, crossed blades) and one Body line at 16px in Ivory. Local-player events only: nuke inbound, an alliance broken against you, a new attack on you. It shows for 4s; a tap or Android back dismisses it. It enters with an 8px rise and a 180ms fade (none under reduced motion). `aria-live` is assertive for a nuke or betrayal, polite for an attack. Vibration (15ms on an attack sent, 40ms when an attack plate shows) goes through `Haptics.ts`; the in-app Vibration setting is the reliable off switch, since Android's own per-app switch is not.

### Tutorial Banner

Top-centre, at most 420px wide: a plate holding the step's first sentence, whole (never clamped mid-sentence). When more follows, a Gold Leaf chevron sits at the end; tapping shows the rest and turns the chevron upward. The heading reads the chapter and the step within it ("EXPAND · 2 OF 6"); the Skip chip and a 32px close button sit in the same header row. The tutorial runs in three chapters, one per game: Expand from the first game, Build once the player can afford a City, War once they can afford a Missile Silo (`TutorialChapters.ts`).

## Do's and Don'ts

### Do:

- **Do** scope every rule under `body.mobile-theme` and reach upstream components through the token remap or targeted selectors, never by forking them.
- **Do** use exactly one gold face per decision group and steel for the rest.
- **Do** keep touch targets at least 48px, text at least 14px and numbers at least 16px, and add `env(safe-area-inset-*)` to every edge-anchored offset.
- **Do** set every number in Barlow Condensed 700 with tabular lining figures.
- **Do** press with a 2px drop over 90ms on the `cubic-bezier(0.16, 1, 0.3, 1)` ease; enter overlays with an 8px rise and fade (180ms to 260ms); turn entrance animations off under `prefers-reduced-motion`.
- **Do** leave the battlefield as upstream renders it, including the #262626 in-game ground.

### Don't:

- **Don't** use coloured glows or blue accents on mobile surfaces; the remap turns upstream's blue glows into plain dark drop shadows.
- **Don't** put Ivory or white text on a gold face.
- **Don't** float text on the map without a plate. HUD information lives on plates anchored to the screen edges.
- **Don't** load web fonts from a CDN; the app is offline and its CSP blocks them.
- **Don't** use OpenFront's logo or brand art on mobile surfaces (the title screen hides it).

## Known Open Items

These are defects the shipped build carries, not rules to copy.

- The brand mark (`android/app/src/main/res/drawable/wc_mark.xml`, a globe with one quarter claimed in Struck Gold and Gold Leaf strokes on Night) is placeholder grade. The adaptive icon uses it until a final mark replaces it. The native launch screen is plain Night with no mark (the portrait frame before `sensorLandscape` cannot draw one sideways); the web launch frame fades the wordmark in over 200ms.
- The solo setup rail leaves empty space above START.
- The tutorial banner's heading keeps upstream's yellow title style (now carrying the chapter counter). It is not a label style for new surfaces.
- `--wc-gold-lo` is declared but unused. The ember (#f0a04b) and the button face and rim colours are literals, not `--wc-*` properties.
