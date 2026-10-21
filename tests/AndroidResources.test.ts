import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const root = path.join(import.meta.dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf-8");
const res = "android/app/src/main/res";

describe("android resources", () => {
  it("the launch theme is plain Night, the same colour the web launch frame starts from", () => {
    const night = /#0b1020/i;
    expect(read(`${res}/values/ic_launcher_background.xml`)).toMatch(night);
    expect(read("index.html")).toMatch(
      /#wc-boot\s*{[^}]*background:\s*#0b1020/i,
    );
    // html.preload hides the body (and #wc-boot in it); the frame must stay up.
    expect(read("index.html")).toMatch(
      /html\.preload\s*{[^}]*#0b1020\s*!important/i,
    );
    expect(read("index.html")).toMatch(/#wc-boot\s*{\s*visibility:\s*visible/i);
    const styles = read(`${res}/values/styles.xml`);
    const launch = styles.slice(styles.indexOf("NoActionBarLaunch"));
    expect(launch).toContain("@color/ic_launcher_background");
    // The splash icon is the night colour itself, so no directional mark is drawn.
    expect(launch).toContain(
      '"windowSplashScreenAnimatedIcon">@drawable/ic_launcher_background',
    );
    expect(launch).not.toMatch(/drawable\/splash|wc_mark/);
  });

  it("does not back up app data and ships no unused FileProvider", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toMatch(/FileProvider|file_paths/);
    expect(fs.existsSync(path.join(root, res, "xml/file_paths.xml"))).toBe(
      false,
    );
  });

  it("keeps signing secrets out of git", () => {
    const androidIgnore = read("android/.gitignore");
    expect(androidIgnore).toMatch(/^\*\.jks$/m);
    expect(androidIgnore).toMatch(/^\*\.keystore$/m);
    const rootIgnore = read(".gitignore");
    for (const entry of ["keystore.properties", "*.jks", "*.keystore"]) {
      expect(rootIgnore.split(/\r?\n/)).toContain(entry);
    }
  });
});
