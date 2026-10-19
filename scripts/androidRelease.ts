// npm run android:release: gated web build, cap sync, Gradle assemble, and the
// APK copied next to the build under its tag. Works in PowerShell, cmd and
// Git Bash. Steps and error codes: docs/mobile/ANDROID.md#release-gate.
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.join(import.meta.dirname, "..");
const isWindows = process.platform === "win32";

function run(cmd: string, args: string[], cwd: string): void {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: isWindows });
  if (r.status !== 0) {
    if (cmd.includes("gradlew")) {
      console.error(
        "WC_GRADLE_FAILED: the Android build failed. Fix: set JAVA_HOME to Android Studio's jbr (see docs/mobile/ANDROID.md#release-gate), then re-run npm run android:release",
      );
    }
    process.exit(r.status ?? 1);
  }
}

// Runs the release gate first: it refuses a placeholder source URL, a dirty
// tree or an untagged commit before anything is built.
run("npm", ["run", "android:sync:release"], root);
run(
  isWindows ? "gradlew.bat" : "./gradlew",
  ["assembleDebug"],
  path.join(root, "android"),
);

const tag = execSync("git describe --tags --exact-match", {
  cwd: root,
  encoding: "utf-8",
}).trim();
const apk = path.join(
  root,
  "android/app/build/outputs/apk/debug/app-debug.apk",
);
const out = path.join(root, "dist-mobile", `WorldOfConflict-${tag}.apk`);
fs.copyFileSync(apk, out);

const rel = path.relative(root, out).split(path.sep).join("/");
console.log(`READY ${rel}`);
console.log(`Attach it: gh release create ${tag} ${rel} --title "${tag}"`);
