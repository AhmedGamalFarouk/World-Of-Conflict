# Android build

The app is the `npm run build-mobile` client (`dist-mobile/`) in a Capacitor
shell (`capacitor.config.json`, `android/`). Plan: [NEXT-STEPS.md](NEXT-STEPS.md).

## Debug APK

Needs JDK 21 (Android Studio's bundled `jbr` works), the Android SDK (API 36)
and `adb`. Put `sdk.dir=<path to Sdk>` in `android/local.properties`
(git-ignored), forward slashes.

```bash
npm run inst
npm run android:doctor
npm run android:debug
adb install -r dist-mobile/WorldOfConflict-dev.apk
```

`android:doctor` prints a `WC_DOCTOR_*` code and the fix for each missing tool.
`android:debug` rebuilds `dist-mobile/`, syncs it into the app, runs
`assembleDebug` and prints `READY <path> (<size> MB)`. Debug builds allow
WebView debugging at `chrome://inspect` and show DEV BUILD in About.

Fixed in `android/`: `minSdkVersion` 26, `sensorLandscape`. App id
`com.worldofconflict.game` (confirmed by the owner 2026-10-16; permanent once on
Play).

## Feasibility gate (device test, record in the table below)

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
version About shows (AGPL-3.0 source offer).
`npm run build-mobile` builds a dev APK: About marks it **DEV BUILD, do not
share**. `npm run android:release` builds a release and refuses one that
couldn't legally be shared.

### Signing

Play wants an upload key. Create it once, outside the repo, and back it up
(lose it and you must ask Play to reset the upload key):

```bash
keytool -genkeypair -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Copy `android/keystore.properties.example` to `android/keystore.properties`
(git-ignored, as are `*.jks` and `*.keystore`) and fill it in. Play App Signing
stays on, so Google holds the app signing key. Release builds are not
minified (`minifyEnabled false`) for v0.2.0.

For CI, store the keystore and passwords as secrets:

```bash
base64 -w0 upload.jks | gh secret set ANDROID_KEYSTORE_B64
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS
gh secret set ANDROID_KEY_PASSWORD
```

### Release steps

Order: `version:set`, commit, tag, push the tag. Every Play upload gets its own
patch tag.

```bash
npm run version:set -- 0.2.0 # versionName "0.2.0", versionCode 200
git commit -am "Release v0.2.0"
git tag v0.2.0
git push origin main v0.2.0 # .github/workflows/android-release.yml builds and attaches
```

`versionCode` is `major*10000 + minor*100 + patch`. The workflow can also be run
by hand with `dry_run: true` (the default): it builds and keeps the files as a
workflow artifact without touching any Release; do that before the first tag.
A dry run sets `WC_DRY_RUN=1`, which skips only the gate's tag check (the
`versionName` and `versionCode` checks still run). `storeFile` in
`keystore.properties` must be an absolute path.

To build locally instead: `npm run android:release` (doctor, signing check,
gated build, then `dist-mobile/WorldOfConflict-vX.Y.Z.aab` and `.apk`), then
upload with the `gh release upload ... --clobber` line it prints.

Never `gh release create` before the upstream workflows are gone from
`.github/workflows/` (only `ci.yml` and `android-release.yml` belong there).

### Error codes

Every failure prints all problems at once, then stops the build.

| Code                       | Meaning                                           | Fix                                                                  |
| -------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- |
| `WC_DOCTOR_JAVA`           | Java 21 not found                                 | install JDK 21 or set `JAVA_HOME` to Android Studio's jbr            |
| `WC_DOCTOR_SDK`            | Android SDK not found                             | set `ANDROID_HOME` or `sdk.dir` in `android/local.properties`        |
| `WC_DOCTOR_GRADLE`         | `android/gradlew` missing                         | `git checkout -- android/gradlew android/gradlew.bat android/gradle` |
| `WC_DOCTOR_ADB`            | `adb` not found (debug only)                      | add `<Sdk>/platform-tools` to PATH                                   |
| `WC_SIGNING_MISSING`       | no or incomplete `android/keystore.properties`    | copy the `.example`, fill it in; or use `npm run android:debug`      |
| `WC_SIGNING_INVALID`       | the keystore won't open with those credentials    | check `storeFile` (absolute path) and the passwords                  |
| `WC_GATE_KEYSTORE_TRACKED` | git tracks a keystore or `keystore.properties`    | `git rm --cached` it and rotate the key                              |
| `WC_GATE_SOURCE_URL`       | `SOURCE_URL` isn't a `https://github.com/` repo   | point it at the public repo in `src/client/mobile/AppInfo.ts`        |
| `WC_GATE_DIRTY`            | uncommitted or untracked files                    | commit or `git stash -u`                                             |
| `WC_GATE_UNTAGGED`         | HEAD has no tag                                   | `git tag vX.Y.Z && git push origin vX.Y.Z`                           |
| `WC_GATE_BAD_TAG`          | tag isn't `vX.Y.Z` (About would say DEV BUILD)    | re-tag as `vX.Y.Z`                                                   |
| `WC_GATE_VERSION_NAME`     | `versionName` doesn't match the tag               | `npm run version:set -- X.Y.Z`, commit, re-tag                       |
| `WC_GATE_VERSION_CODE`     | `versionCode` isn't `major*10000+minor*100+patch` | `npm run version:set -- X.Y.Z`, commit, re-tag                       |
| `WC_GATE_AAB_SIZE`         | the AAB is over Play's 150 MB limit               | trim the folders the message lists                                   |
| `WC_GRADLE_FAILED`         | Gradle failed                                     | read the Gradle error above it                                       |

In-app error log codes (About > Copy error log): `save.write_failed`,
`save.storage_unavailable`, `save.stale`, `save.damaged`, `resume-desync`,
`errlog.clipboard_failed`, `js.error`, `js.unhandled_rejection`,
`worker.error`, `fatal.<kind>` (`map_load`, `crashed`, `gl_lost`,
`cant_start`, `spawn_failed`).

### Tester crash reports

1. Ask for About > Copy error log, pasted into a GitHub issue.
2. The header line has the app version and commit; match it to the release tag.
3. For a native crash: `adb logcat -s Capacitor chromium`.

### Save and resume

A save is the game's turn list, written every 60 s of game time, when the app
goes to the background and on EXIT TO HOME. CONTINUE starts a fresh game and the
existing rejoin path feeds it every saved turn, so the worker catches up (a
longer game takes longer). A save from another release build is discarded at
boot with a notice. Dev builds never go stale; set
`localStorage["wc.dev.autosaveSeconds"]` to shorten the interval (ignored in
release builds). To test a kill: play a minute,
`adb shell am force-stop com.worldofconflict.game`, relaunch, CONTINUE.

### Device test record (A2)

Run on a 4 GB phone, on Europe (the largest curated map).

| Device  | Android / WebView | Median fps | 1% low | Crash / OOM | 10 bg/fg cycles | Back | Reverse landscape |
| ------- | ----------------- | ---------- | ------ | ----------- | --------------- | ---- | ----------------- |
| (owner) |                   |            |        |             |                 |      |                   |

### Release checklist (on the emulator, from the Release asset)

- About shows the tag, no DEV BUILD line, and the right source link.
- Source code / License text / OpenFront source / CC BY-SA 4.0 open the
  system browser; back returns to the app.
- Open-source licenses lists `lit` and `zod` (`dist-mobile/licenses.md`).
- The "Could not spawn" panel is readable at 844x390; BACK TO HOME and Android
  back both leave the game.

### Trigger the fatal screens locally

- GPU loss: in the preview console during a game,
  `document.querySelector("canvas").getContext("webgl2").getExtension("WEBGL_lose_context").loseContext()`
  shows "Game can't resume" (WC-E03) after 3 s.
- Map load failure: delete one `dist-mobile/maps/<map>/map.bin`, serve, and
  start that map: "Couldn't load this map" (WC-E01).
