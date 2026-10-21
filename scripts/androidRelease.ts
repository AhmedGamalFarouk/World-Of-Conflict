// npm run android:release: doctor, signing check, gated web build, cap sync,
// signed bundleRelease + assembleRelease, copied next to the build under
// the tag. Steps and error codes: docs/mobile/ANDROID.md#error-codes.
import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import {
  aabSizeProblem,
  androidDir,
  dirSize,
  fail,
  gradlew,
  keytoolPath,
  parseProperties,
  root,
  run,
  runDoctor,
  signingProblem,
} from "./androidTools";

runDoctor(false);

const propsFile = path.join(androidDir, "keystore.properties");
const props = fs.existsSync(propsFile)
  ? parseProperties(fs.readFileSync(propsFile, "utf-8"))
  : null;
const missing = signingProblem(
  props,
  props?.storeFile ? fs.existsSync(props.storeFile) : false,
);
if (missing) fail(missing);

// Passwords go through the environment, never the command line.
const keytool = spawnSync(
  keytoolPath(),
  ["-list", "-keystore", props!.storeFile!, "-storepass:env", "WC_STOREPASS"],
  { env: { ...process.env, WC_STOREPASS: props!.storePassword } },
);
if (keytool.status !== 0) {
  fail(
    "WC_SIGNING_INVALID: keytool could not open the keystore (wrong password or file). Fix: check storeFile and storePassword in android/keystore.properties",
  );
}

// Runs the release gate first: it refuses a dirty tree, an untagged commit or
// a versionCode that doesn't match the tag before anything is built.
run("npm", ["run", "android:sync:release"], root);
run(gradlew(), ["bundleRelease", "assembleRelease"], androidDir);

// A dry run (WC_DRY_RUN=1, scripts/mobileBuild.ts) may sit on an untagged commit.
let tag: string;
try {
  tag = execSync("git describe --tags --exact-match", {
    cwd: root,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch (e) {
  if (process.env.WC_DRY_RUN !== "1") throw e;
  const gradle = fs.readFileSync(
    path.join(androidDir, "app/build.gradle"),
    "utf-8",
  );
  tag = `v${/versionName\s+"([^"]+)"/.exec(gradle)?.[1] ?? "0.0.0"}`;
}
const outputs = path.join(androidDir, "app/build/outputs");
const aab = path.join(outputs, "bundle/release/app-release.aab");
const apk = path.join(outputs, "apk/release/app-release.apk");

const assets = path.join(androidDir, "app/src/main/assets/public");
const folders = fs
  .readdirSync(assets, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => ({ name: e.name, bytes: dirSize(path.join(assets, e.name)) }));
const tooBig = aabSizeProblem(fs.statSync(aab).size, folders);
if (tooBig) fail(tooBig);

const dist = path.join(root, "dist-mobile");
const outAab = path.join(dist, `WorldOfConflict-${tag}.aab`);
const outApk = path.join(dist, `WorldOfConflict-${tag}.apk`);
fs.copyFileSync(aab, outAab);
fs.copyFileSync(apk, outApk);

for (const f of [outAab, outApk]) {
  const mb = (fs.statSync(f).size / 1048576).toFixed(1);
  console.log(
    `READY ${path.relative(root, f).split(path.sep).join("/")} (${mb} MB)`,
  );
}
console.log(
  `Attach: gh release upload ${tag} dist-mobile/WorldOfConflict-${tag}.aab dist-mobile/WorldOfConflict-${tag}.apk --clobber`,
);
