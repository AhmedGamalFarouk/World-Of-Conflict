# Android build

The app is the `npm run build-mobile` client (`dist-mobile/`) in a Capacitor
shell (`capacitor.config.json`, `android/`). Plan: [PLAN.md](PLAN.md).

## Debug APK

Needs JDK 21 (Android Studio's bundled `jbr` works) and the Android SDK
(API 36). Put `sdk.dir=<path to Sdk>` in `android/local.properties`
(git-ignored), forward slashes.

```bash
npm run android:sync
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`android:sync` rebuilds `dist-mobile/` and copies it into the app; run it after
every web change. Output: `android/app/build/outputs/apk/debug/app-debug.apk`
(~62 MB). Debug builds allow WebView debugging at `chrome://inspect`.

Fixed in `android/`: `minSdkVersion` 26, `sensorLandscape`. App id
`com.worldofconflict.game` (confirmed by the owner 2026-10-16; permanent once on
Play).

## Feasibility gate (PLAN.md, before the UX pass)

Reference device: 4 GB RAM, Snapdragon 6-series / Helio G-class, Android 11+.

- [ ] Airplane mode: cold start → Solo → largest curated map (World) → play to
      the aftergame screen → menu, with no error dialog.
- [ ] Median ≥30 fps from minute 5 to 15 on World (performance overlay); log
      median and 1%-low fps, device model, Android and WebView versions.
- [ ] No OOM / WebView crash (`adb logcat | grep -iE "FATAL|render process"`).
- [ ] 10 background/foreground cycles mid-game: game pauses and resumes, no
      WebGL context loss.
- [ ] Android back: home page → closes it; home → asks, then exits; in game →
      pauses and asks; Cancel resumes.
- [ ] Rotate 180° (reverse landscape): note whether the HUD clears the cutout.

On a fps miss, apply in order and re-measure: smaller maps only, a mobile
`GraphicsOverrides` set, a higher device floor.

Checked on the Pixel 9 emulator (2026-10-16): offline boot, World map loads
into the worker, WebGL2 renders, back shows the exit confirm.

Checked on a vivo V2529 (2026-10-19; MediaTek MT6878, 8 GB, Android 16,
WebView 155; above the reference device): cold start 1.6 s, no requests
leave `https://localhost` (adb over Wi-Fi, so not in airplane mode). World,
400 bots: median 60 fps through minute ~9 (spectating after defeat at 5:13
from minute 5:46), 1%-low 52–55 fps; PSS 450–540 MB; no FATAL / render
process / OOM in logcat. One background trip mid-game paused the game clock and
resumed. Not checked yet: minutes 9–15, 10 lifecycle cycles, back button,
reverse landscape, a 4 GB phone.

Known: Capacitor logs "Error injecting safe area CSS" during page load (its
inset script runs before the document exists; whether a later run sets the
`--safe-area-inset-*` vars is to be checked in the UX pass). The
HUD still draws under the status bar; safe areas are part of the UX pass.

## Release gate

A playtest APK may leave this machine only as a GitHub Release on the public
World Of Conflict repo, built from a clean commit whose tag matches the
version About shows (AGPL-3.0 source offer, docs/mobile/PLAYTEST-PLAN.md).
`npm run build-mobile` builds a dev APK: About marks it **DEV BUILD, do not
share**. `npm run android:release` builds a release and refuses one that
couldn't legally be shared.

### Release steps

PowerShell:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
# 1. android/app/build.gradle: versionName "0.1.0", versionCode +1
# 2. src/client/mobile/AppInfo.ts: SOURCE_URL = the public repo
git commit -am "Release v0.1.0"
git tag v0.1.0
git push origin main v0.1.0
npm run android:release
gh release create v0.1.0 dist-mobile/WorldOfConflict-v0.1.0.apk --title v0.1.0
```

Git Bash: the same, with `export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"`.

Back up `~/.android/debug.keystore` once and build every playtest APK with
it: an APK signed with another key will not install over the previous one, so
testers would have to uninstall (and lose their play counter). Debug APKs are
debuggable (WebView remote debugging is on); fine for a sideloaded playtest,
not for a store release.

### Gate errors

Every failure prints all problems at once, then stops the build.

| Code                      | Meaning                                             | Fix                                        |
| ------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `WC_GATE_PLACEHOLDER_URL` | `SOURCE_URL` is still the placeholder               | set it in `src/client/mobile/AppInfo.ts`   |
| `WC_GATE_SOURCE_URL`      | `SOURCE_URL` isn't a `https://github.com/` repo     | point it at the public repo                |
| `WC_GATE_DIRTY`           | uncommitted or untracked files                      | commit or `git stash -u`                   |
| `WC_GATE_UNTAGGED`        | HEAD has no tag                                     | `git tag vX.Y.Z && git push origin vX.Y.Z` |
| `WC_GATE_BAD_TAG`         | tag isn't `vX.Y.Z` (About would say DEV BUILD)      | re-tag as `vX.Y.Z`                         |
| `WC_GATE_VERSION_NAME`    | `versionName` in build.gradle doesn't match the tag | set it, bump `versionCode`, commit, re-tag |
| `WC_GRADLE_FAILED`        | Gradle failed                                       | set `JAVA_HOME` to Android Studio's jbr    |

### Release checklist (on the emulator, from the Release asset)

- About shows the tag, no DEV BUILD line, and the right source link.
- Source code / License text / OpenFront source / CC BY-SA 4.0 open the
  system browser; back returns to the app.
- Open-source licenses lists `lit` and `zod` (`dist-mobile/licenses.md`).
- The "didn't spawn" message (upstream modal) is readable at 844x390 and
  closes with Android back.

### Trigger the fatal screens locally

- GPU loss: in the preview console during a game,
  `document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()`
  shows "Game can't resume" (WC-E03) after 3 s.
- Map load failure: delete one `dist-mobile/maps/<map>/map.bin`, serve, and
  start that map: "Couldn't load this map" (WC-E01).
