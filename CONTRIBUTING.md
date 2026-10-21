# Contributing to World Of Conflict

World Of Conflict is an offline Android app (Capacitor) adapting
[OpenFront](https://github.com/openfrontio/OpenFrontIO). Read `PRODUCT.md`,
`DESIGN.md` (the authority for all UI) and `docs/mobile/NEXT-STEPS.md` (the plan)
first.

## Build and install a debug APK

Needs JDK 21 (Android Studio's bundled `jbr` works), the Android SDK (API 36)
and `adb`.

```bash
npm run inst
npm run android:doctor
npm run android:debug
adb install -r dist-mobile/WorldOfConflict-dev.apk
```

`android:doctor` prints a `WC_DOCTOR_*` code and the fix for anything missing.
The debug APK shows DEV BUILD in About and must not be shared. A clean clone
to an installed APK should take about 15 minutes after the JDK and SDK are in.

Dev builds use `build-mobile` / `android:sync`; release builds use
`build-mobile:release` / `android:sync:release`. Browser preview of the phone UI:
`npm run build-mobile`, then serve `dist-mobile/` (config `mobile-preview` in
`.claude/launch.json`, viewport 844x390).

## Release (maintainer)

Signing, `version:set`, the release gate and the error-code table are in
[docs/mobile/ANDROID.md](docs/mobile/ANDROID.md). Short form:
`npm run version:set -- X.Y.Z`, commit, `git tag vX.Y.Z`, push the tag; CI
builds and attaches the signed AAB and APK.

## Rules

- **Thin layer.** The engine (`packages/engine*`) stays untouched. Mobile code
  lives in `src/client/mobile/`, `mobile-theme.css` (scoped to
  `body.mobile-theme`) and small `isMobileShell()` / `isOffline()` branches.
  No new dependencies.
- **Engine fixes belong upstream** in OpenFrontIO; merge them in monthly.
- All user-visible text goes through `translateText()` with a key in
  `resources/lang/en.json` only (Crowdin owns the other locales).
- Every new module gets a test. Before a PR run the targeted vitest files,
  `npm run typecheck` and `npm run lint` (the full suite takes ~10 minutes).
- Layer boundaries are in `CLAUDE.md` and enforced by `tests/LayerBoundaries.test.ts`.

## Licence

AGPL-3.0 (code) and CC BY-SA 4.0 (assets); see `LICENSING.md`. By contributing
you agree your work is released under the same terms.
