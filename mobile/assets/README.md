# Mobile asset overlay

The mobile build (`vite --mode mobile`) layers this folder over `resources/`
at the same URLs, the way the web build layers `proprietary/`. That keeps
OpenFront's all-rights-reserved assets out of the app without touching the
code that loads them.

| Path | Replaces | Source |
|---|---|---|
| `fonts/OpenFront.ttf` | proprietary font | `resources/fonts/overpass-bold.woff` (Overpass, SIL OFL); browsers detect the WOFF format from the bytes |
| `images/OpenFrontLogo.svg`, `images/Favicon.svg` | proprietary logos | placeholder wordmark, made for this project |
| `sounds/effects/game-start-alert.mp3` | proprietary alert | `resources/sounds/effects/game-start.mp3` (CC BY-SA 4.0, OpenFront) |
| `sounds/music/*.mp3` | proprietary music | 2 s of silence (ffmpeg `anullsrc`) until we have open music |

The mobile build fails if any file in its output has the same bytes as a file
in `proprietary/` (`scripts/mobileBuild.ts`). A proprietary file the client
loads with no entry here shows up as a 404 in the offline smoke run.
