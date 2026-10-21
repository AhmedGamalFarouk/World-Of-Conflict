// npm run version:set -- X.Y.Z: versionName and versionCode in build.gradle.
// Order: version:set, commit, tag vX.Y.Z, push the tag.
import fs from "fs";
import path from "path";
import { androidDir, fail, setGradleVersion } from "./androidTools";

const version = process.argv[2] ?? "";
const file = path.join(androidDir, "app/build.gradle");
try {
  fs.writeFileSync(
    file,
    setGradleVersion(fs.readFileSync(file, "utf-8"), version),
  );
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
console.log(
  `build.gradle -> ${version}. Next: commit, git tag v${version}, push the tag.`,
);
