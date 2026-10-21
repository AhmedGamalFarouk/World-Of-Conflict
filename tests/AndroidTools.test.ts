import { describe, expect, it } from "vitest";
import {
  aabSizeProblem,
  doctorProblems,
  parseProperties,
  setGradleVersion,
  signingProblem,
} from "../scripts/androidTools";

const ready = {
  javaMajor: 21,
  sdkDir: "/sdk",
  gradlewExists: true,
  adbFound: true,
};
const codes = (errors: string[]) => errors.map((e) => e.split(":")[0]);

describe("doctorProblems", () => {
  it("passes a complete setup", () => {
    expect(doctorProblems(ready, true)).toEqual([]);
  });

  it("names every missing piece, adb only when asked", () => {
    const bare = {
      javaMajor: 17,
      sdkDir: null,
      gradlewExists: false,
      adbFound: false,
    };
    expect(codes(doctorProblems(bare, false))).toEqual([
      "WC_DOCTOR_JAVA",
      "WC_DOCTOR_SDK",
      "WC_DOCTOR_GRADLE",
    ]);
    expect(codes(doctorProblems(bare, true))).toContain("WC_DOCTOR_ADB");
  });
});

describe("signing", () => {
  const full = {
    storeFile: "/keys/k.jks",
    storePassword: "p",
    keyAlias: "a",
    keyPassword: "p",
  };

  it("parses a properties file, skipping comments", () => {
    expect(
      parseProperties("# c\nstoreFile=C:/k.jks\r\nkeyAlias = upload\n"),
    ).toEqual({
      storeFile: "C:/k.jks",
      keyAlias: "upload",
    });
  });

  it("unescapes backslashes the way Gradle does", () => {
    expect(parseProperties("storePassword=a\\\\b")).toEqual({
      storePassword: "a\\b",
    });
  });

  it("reports missing, incomplete and absent keystores without printing secrets", () => {
    expect(signingProblem(null, false)).toContain("WC_SIGNING_MISSING");
    const partial = signingProblem({ ...full, storePassword: "" }, true);
    expect(partial).toContain("storePassword");
    expect(
      signingProblem({ ...full, storePassword: "hunter2" }, false),
    ).not.toContain("hunter2");
    expect(signingProblem({ ...full, storeFile: "k.jks" }, true)).toContain(
      "WC_SIGNING_INVALID",
    );
    expect(signingProblem(full, true)).toBeNull();
  });
});

describe("aabSizeProblem", () => {
  it("passes under the limit and lists the 5 largest folders over it", () => {
    expect(aabSizeProblem(100 * 1048576, [])).toBeNull();
    const folders = "abcdefg"
      .split("")
      .map((name, i) => ({ name, bytes: (i + 1) * 1048576 }));
    const msg = aabSizeProblem(151 * 1048576, folders)!;
    expect(msg).toContain("WC_GATE_AAB_SIZE");
    expect(msg).toContain("g 7.0 MB");
    expect(msg).not.toContain("a 1.0 MB");
  });
});

describe("setGradleVersion", () => {
  const gradle = 'versionCode 1\n        versionName "0.1.0"';

  it("writes versionName and versionCode = major*10000+minor*100+patch", () => {
    expect(setGradleVersion(gradle, "0.2.0")).toBe(
      'versionCode 200\n        versionName "0.2.0"',
    );
  });

  it("refuses a tag suffix", () => {
    expect(() => setGradleVersion(gradle, "0.2.0-rc1")).toThrow();
  });
});
