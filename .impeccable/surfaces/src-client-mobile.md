---
version: 1
slug: "src-client-mobile"
primary_target: "src/client/mobile"
related_targets: ["src/client/hud","index.html"]
---

# Surface brief: mobile app UI (all screens)

Scope: every UI surface of the offline Android app (home, solo setup, loading, spawn, in-game HUD, pause overlay, aftergame, settings, about). The WebGL battlefield is out of scope and stays as upstream renders it. Mode: Operate.

Audience and job: casual phone players, landscape, one or two thumbs, short sessions vs bots. Job: start a game in seconds, read the state of the war at a glance, send troops without fighting the UI.

Constraints: PRODUCT.md; DESIGN.md rules (48px targets, ≥14px text, ≥16px numbers, safe-area insets, HUD anchors, right-edge vertical ratio slider snapping 25/50/75/100). Mobile-only layer (body.mobile-theme + src/client/mobile/), upstream components untouched where CSS can carry it.

## Direction contract

THESIS: The mobile strategy-game standard, played straight at Supercell finish: dark armoured panels that frame a bright battlefield, gold for what you spend and press, chunky controls that feel struck when tapped. It refuses the desktop web-app look the fork inherited (thin outlines, blue links, floating text clusters) and refuses cartoon softness.

OWN-WORLD: Night-navy plate panels (#141B2D on #0B1020) with a 1px warm-gold hairline and a lit top edge; gold #E8B24A primary buttons with a darker lower lip that compresses on press; steel-navy secondary buttons; troop blue #4A9BE8, danger red #E5484D, growth green #3DBE7A, ivory text #ECE8DF. Barlow Condensed 700/800 uppercase for display and every number (tabular), Barlow 500/600 for body.

STORY: The player opens to a title screen that says World Of Conflict and offers one gold PLAY; picks a map from thumbnails; taps a spawn; then reads troops, gold and send-ratio from the screen edges while the middle stays battlefield; pauses with one tap into an overlay that holds speed, settings and quit.

FIRST VIEWPORT (in-game, 844x390 landscape): top-left 48px rank plate (#3 · land %); top-centre a red-edged event plate only when something critical happens; top-right timer plate + gold pause button; bottom-left economy plate ~260px: troops as the largest numeral on screen, +rate and a max bar beneath, gold to its right; right edge a 60px vertical send-ratio rail, value above in 20px numerals, stops 100/75/50/25 snapping, thumb in gold. Nothing else sits on the map.

FORM: Category standard (canon), chosen by the owner over the rolled direction; seed b008575c. Craft bar: Clash of Clans / Clash Royale, Territorial.io, Risk mobile.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: the send-ratio rail. A thumb drag on the right edge snaps through 100/75/50/25 with a struck-plate press and the value numeral ticking; it is the one control a player touches all game.

Motion grammar: presses compress 1-2px with a 90ms ease-out; plates enter by sliding 8px from their own edge with fade, 180ms, exponential ease-out; nothing loops except the critical event plate's single attention pulse.

Unresolved: app icon and splash raster (needs an SVG rasterizer on this machine); final brand mark beyond the text wordmark.
