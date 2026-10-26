# World Of Conflict

World Of Conflict is an offline Android real-time strategy game about territorial control and alliances, played solo against bots on maps of real-world geography. It is based on [OpenFront.io](https://openfront.io/) ([source](https://github.com/openfrontio/OpenFrontIO)), itself a fork/rewrite of [WarFront.io](https://github.com/WarFrontIO).

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Assets: CC BY-SA 4.0](https://img.shields.io/badge/Assets-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)

## Download

Get the latest APK from the [Releases page](https://github.com/AhmedGamalFarouk/World-Of-Conflict/releases/latest) and install it on an Android 8.0+ phone (landscape only, WebGL2 required). Each release is built by CI from its tag, and About shows that tag and links to the matching source (the AGPL source offer).

- Plays fully offline against bots: Quick game, 15 curated maps, tutorial.
- Your game is saved automatically. After an interruption, CONTINUE on the home screen replays it (a long game takes a while to catch up).
- No accounts, no ads. Anonymous usage stats are off unless you opt in. See the [privacy policy](https://ahmedgamalfarouk.github.io/World-Of-Conflict/privacy.html).
- Something broke? Open a [GitHub issue](https://github.com/AhmedGamalFarouk/World-Of-Conflict/issues) and paste About > Copy error log.

## License

The source code is licensed under the **GNU Affero General Public License v3.0**, inherited from OpenFront.

Upstream copyright notices appear in:

- Footer: "© OpenFront and Contributors"
- Loading screen: "© OpenFront and Contributors"

Modified versions must preserve these notices in reasonably visible locations.

See [LICENSE](LICENSE) for the complete requirements, [LICENSE-ASSETS](LICENSE-ASSETS) for asset licensing, and [LICENSING.md](LICENSING.md) for license history.

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) v24.15.0 or newer in the Node 24 release line
- [npm](https://www.npmjs.com/) v12.1.0 or newer in the npm 12 release line
- For the Android app: JDK 21 and the Android SDK (API 36); see [docs/mobile/ANDROID.md](docs/mobile/ANDROID.md)

Node.js may bundle an older npm version. Upgrade it before installing project dependencies:

```bash
npm install --global --ignore-scripts npm@12.1.0
```

## 🚀 Installation

```bash
git clone https://github.com/AhmedGamalFarouk/World-Of-Conflict.git
cd World-Of-Conflict
npm run inst
```

Do NOT use `npm install` nor `npm i` for project dependencies. `npm run inst` runs `npm ci --ignore-scripts`, which installs exactly the versions in `package-lock.json` without running lifecycle scripts.

## 🎮 Running the Game

### In the browser (mobile build)

```bash
npm run dev:mobile
```

### On Android

```bash
npm run android:doctor # checks JDK 21, the SDK and adb, and says how to fix what's missing
npm run android:debug
adb install -r dist-mobile/WorldOfConflict-dev.apk
```

`android:debug` rebuilds `dist-mobile/`, syncs it into the Capacitor app and builds the APK. A debug APK says DEV BUILD in About and must not be shared. Release builds, signing and the device checklist are in [docs/mobile/ANDROID.md](docs/mobile/ANDROID.md); contributor rules are in [CONTRIBUTING.md](CONTRIBUTING.md).

### Upstream web client and server

The original OpenFront client and server still build and run:

```bash
npm run dev
```

## 🛠️ Development Tools

```bash
npm run format    # Prettier
npm run lint      # Oxlint + ESLint
npm run lint:fix  # Oxlint + ESLint with auto-fix
npm run typecheck # tsc for the root project and each package
npm test          # Vitest
```

## 🏗️ Project Structure

- `/src/client` - Game client (UI and WebGL2 renderer)
- `/src/server` - Upstream multiplayer game server
- `/packages/engine` - Deterministic game simulation (`@openfront/engine`)
- `/packages/engine-api` - The engine's contract: types, schemas, game updates and the worker protocol (`@openfront/engine-api`)
- `/packages/engine-lib` - Engine code also used outside the engine: map grid, rules, helpers (`@openfront/engine-lib`)
- `/packages/shared` - Code shared by client and server: wire schemas, env, asset URLs (`@openfront/shared`)
- `/packages/zbin` - Compact binary wire format for zod schemas
- `/android` - Capacitor Android project
- `/mobile` - Mobile-only assets
- `/resources` - Static assets (images, maps, etc.)
- `/docs/mobile` - Mobile plan, Android build and playtest docs, store listing copy

## Credits

World Of Conflict is a fork of OpenFront.io (AGPL-3.0 code, CC BY-SA 4.0 assets) and is not affiliated with or endorsed by OpenFront. See [CREDITS.md](CREDITS.md).
