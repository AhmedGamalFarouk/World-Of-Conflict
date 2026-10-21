import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const dir = path.join(import.meta.dirname, "..", ".github", "workflows");

describe("workflows", () => {
  it("only ci.yml and android-release.yml exist (no upstream automation)", () => {
    expect(fs.readdirSync(dir).sort()).toEqual([
      "android-release.yml",
      "ci.yml",
    ]);
  });

  it("the release job never echoes the keystore or passes it on a command line", () => {
    const yml = fs.readFileSync(path.join(dir, "android-release.yml"), "utf-8");
    expect(yml).toContain("if: always()");
    expect(yml).not.toMatch(/-storepass\s|-storepass=/);
    // Secrets never appear in a run line other than as env vars.
    expect(yml).not.toMatch(/echo[^\n]*\$\{\{\s*secrets\./);
  });

  it("only a manual dry run skips the tag check", () => {
    const yml = fs.readFileSync(path.join(dir, "android-release.yml"), "utf-8");
    expect(yml).toMatch(
      /WC_DRY_RUN:.*workflow_dispatch.*inputs\.dry_run.*'1'.*''/,
    );
  });
});
