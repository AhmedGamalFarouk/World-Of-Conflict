// npm run android:debug: web build + sync + assembleDebug, copied to
// dist-mobile/WorldOfConflict-dev.apk. Debug-signed, shows DEV BUILD.
import fs from "fs";
import path from "path";
import { androidDir, gradlew, root, run, runDoctor } from "./androidTools";

runDoctor(true);
run("npm", ["run", "android:sync"], root);
run(gradlew(), ["assembleDebug"], androidDir);

const apk = path.join(androidDir, "app/build/outputs/apk/debug/app-debug.apk");
const out = path.join(root, "dist-mobile", "WorldOfConflict-dev.apk");
fs.copyFileSync(apk, out);
const mb = (fs.statSync(out).size / 1048576).toFixed(1);
console.log(
  `READY ${path.relative(root, out).split(path.sep).join("/")} (${mb} MB)`,
);
