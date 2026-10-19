import fs from "fs";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  checkMobileDist,
  checkReleaseGate,
  copyMobileResources,
} from "../scripts/mobileBuild";
import {
  isDevBuild,
  RELEASE_TAG_RE,
  SOURCE_URL_PLACEHOLDER,
} from "../src/client/mobile/AppInfo";

let root: string;
let resources: string;
let overlay: string;
let proprietary: string;
let out: string;

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeMap(dir: string, folder: string) {
  for (const name of ["map.bin", "map4x.bin", "map16x.bin", "manifest.json"]) {
    write(path.join(dir, "maps", folder, name), `${folder}/${name}`);
  }
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "mobile-build-"));
  resources = path.join(root, "resources");
  overlay = path.join(root, "overlay");
  proprietary = path.join(root, "proprietary");
  out = path.join(root, "out");
  write(path.join(proprietary, "fonts", "OpenFront.ttf"), "proprietary font");
  write(path.join(proprietary, "LICENSE"), "all rights reserved");
  write(
    path.join(out, "index.html"),
    '<script src="/assets/index.js"></script>',
  );
  writeMap(out, "world");
});

describe("copyMobileResources", () => {
  it("copies curated maps, root public files and the overlay, nothing else", () => {
    writeMap(resources, "world");
    writeMap(resources, "europe");
    write(path.join(resources, "lang", "en.json"), "{}");
    write(path.join(resources, "public", "robots.txt"), "ok");
    write(path.join(overlay, "fonts", "OpenFront.ttf"), "open font");
    write(path.join(overlay, "README.md"), "docs");
    const dest = path.join(root, "dest");

    copyMobileResources(resources, overlay, dest, ["world"]);

    expect(fs.existsSync(path.join(dest, "maps", "world", "map.bin"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(dest, "maps", "europe"))).toBe(false);
    expect(fs.existsSync(path.join(dest, "lang", "en.json"))).toBe(true);
    expect(fs.existsSync(path.join(dest, "robots.txt"))).toBe(true);
    expect(fs.existsSync(path.join(dest, "public"))).toBe(false);
    expect(
      fs.readFileSync(path.join(dest, "fonts", "OpenFront.ttf"), "utf-8"),
    ).toBe("open font");
    expect(fs.existsSync(path.join(dest, "README.md"))).toBe(false);
  });
});

describe("checkMobileDist", () => {
  it("passes a clean build", () => {
    expect(checkMobileDist(out, proprietary, ["world"])).toEqual([]);
  });

  it("flags proprietary bytes under any name", () => {
    write(path.join(out, "assets", "font-abc123.ttf"), "proprietary font");

    expect(checkMobileDist(out, proprietary, ["world"])).toEqual([
      expect.stringContaining("proprietary/fonts/OpenFront.ttf"),
    ]);
  });

  it("flags scripts and links from another origin, including protocol-relative", () => {
    write(
      path.join(out, "index.html"),
      '<script src="https://tracker.example/x.js"></script><script src="//cdn.example/y.js"></script><link href="/local.css">',
    );

    const errors = checkMobileDist(out, proprietary, ["world"]);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("https://tracker.example/x.js");
    expect(errors[1]).toContain("//cdn.example/y.js");
  });

  it("flags a curated map with missing files", () => {
    expect(checkMobileDist(out, proprietary, ["world", "europe"])).toEqual(
      expect.arrayContaining([
        "maps/europe/map.bin is missing",
        "maps/europe/manifest.json is missing",
      ]),
    );
  });
});

describe("release gate", () => {
  const ok = {
    sourceUrl: "https://github.com/someone/world-of-conflict",
    placeholderUrl: SOURCE_URL_PLACEHOLDER,
    porcelain: "",
    exactTag: "v0.1.0",
    versionName: "0.1.0",
    tagPattern: RELEASE_TAG_RE,
  };
  const codes = (errors: string[]) => errors.map((e) => e.split(":")[0]);

  it("passes a clean, tagged build with the real source link", () => {
    expect(checkReleaseGate(ok)).toEqual([]);
  });

  it("refuses the placeholder or a non-GitHub source link", () => {
    expect(
      codes(checkReleaseGate({ ...ok, sourceUrl: SOURCE_URL_PLACEHOLDER })),
    ).toEqual(["WC_GATE_PLACEHOLDER_URL"]);
    expect(
      codes(checkReleaseGate({ ...ok, sourceUrl: "http://example.com/x" })),
    ).toEqual(["WC_GATE_SOURCE_URL"]);
  });

  it("lists the dirty paths and how to fix them", () => {
    const [error] = checkReleaseGate({
      ...ok,
      porcelain: " M src/a.ts\n?? notes.txt",
    });
    expect(error).toContain("WC_GATE_DIRTY");
    expect(error).toContain("?? notes.txt");
    expect(error).toContain("git stash -u");
  });

  it("refuses an untagged commit, a non-release tag and a versionName mismatch", () => {
    expect(codes(checkReleaseGate({ ...ok, exactTag: null }))).toEqual([
      "WC_GATE_UNTAGGED",
    ]);
    expect(codes(checkReleaseGate({ ...ok, exactTag: "v0.1.0-rc1" }))).toEqual([
      "WC_GATE_BAD_TAG",
    ]);
    expect(codes(checkReleaseGate({ ...ok, versionName: "1.0" }))).toEqual([
      "WC_GATE_VERSION_NAME",
    ]);
  });

  it("reports every problem at once", () => {
    const errors = checkReleaseGate({
      ...ok,
      sourceUrl: SOURCE_URL_PLACEHOLDER,
      porcelain: "?? x",
      exactTag: null,
    });
    expect(codes(errors)).toEqual([
      "WC_GATE_PLACEHOLDER_URL",
      "WC_GATE_DIRTY",
      "WC_GATE_UNTAGGED",
    ]);
  });

  it("agrees with the DEV BUILD badge on what a release tag is", () => {
    expect(isDevBuild("v0.1.0")).toBe(false);
    for (const v of [
      "v0.1.0-rc1",
      "v0.1.0-3-gabc1234",
      "v0.1.0-dirty",
      "abc1234",
      "dev",
    ]) {
      expect(isDevBuild(v)).toBe(true);
    }
  });
});
