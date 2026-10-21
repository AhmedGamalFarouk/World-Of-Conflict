// Shared pieces of the android:doctor / android:debug / android:release /
// version:set scripts. The pure checks are tested in tests/AndroidTools.test.ts;
// error codes and fixes: docs/mobile/ANDROID.md#error-codes.
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { versionCodeFor } from "./mobileBuild";

export const root = path.join(import.meta.dirname, "..");
export const androidDir = path.join(root, "android");
export const isWindows = process.platform === "win32";
const doc = "see docs/mobile/ANDROID.md#error-codes";

export interface Env {
  /** Major version of the java on PATH / JAVA_HOME, or null if none runs. */
  javaMajor: number | null;
  /** ANDROID_HOME, ANDROID_SDK_ROOT or android/local.properties sdk.dir. */
  sdkDir: string | null;
  gradlewExists: boolean;
  adbFound: boolean;
}

/** Every missing prerequisite with its code and fix; empty means ready. */
export function doctorProblems(env: Env, needAdb: boolean): string[] {
  const errors: string[] = [];
  if (env.javaMajor !== 21) {
    errors.push(
      `WC_DOCTOR_JAVA: need Java 21, found ${env.javaMajor ?? "none"}. Fix: install JDK 21 or set JAVA_HOME to Android Studio's jbr (${doc})`,
    );
  }
  if (!env.sdkDir) {
    errors.push(
      `WC_DOCTOR_SDK: Android SDK not found. Fix: set ANDROID_HOME, or put sdk.dir=<path> in android/local.properties (${doc})`,
    );
  }
  if (!env.gradlewExists) {
    errors.push(
      `WC_DOCTOR_GRADLE: android/gradlew is missing. Fix: git checkout -- android/gradlew android/gradlew.bat android/gradle (${doc})`,
    );
  }
  if (needAdb && !env.adbFound) {
    errors.push(
      `WC_DOCTOR_ADB: adb not found. Fix: add <Sdk>/platform-tools to PATH (${doc})`,
    );
  }
  return errors;
}

export interface SigningProps {
  storeFile?: string;
  storePassword?: string;
  keyAlias?: string;
  keyPassword?: string;
}

export function parseProperties(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/.exec(line);
    // Gradle reads these as Java properties, where a backslash escapes.
    if (m) out[m[1]] = m[2].replace(/\\(.)/g, "$1");
  }
  return out;
}

/** null when keystore.properties is complete; names no secret values. */
export function signingProblem(
  props: SigningProps | null,
  keystoreExists: boolean,
): string | null {
  const fix =
    "Fix: copy android/keystore.properties.example to android/keystore.properties and fill it in, or use npm run android:debug for a test build";
  if (props === null)
    return `WC_SIGNING_MISSING: no android/keystore.properties. ${fix}`;
  const missing = (
    ["storeFile", "storePassword", "keyAlias", "keyPassword"] as const
  ).filter((k) => !props[k]);
  if (missing.length > 0) {
    return `WC_SIGNING_MISSING: android/keystore.properties lacks ${missing.join(", ")}. ${fix}`;
  }
  // Gradle resolves a relative storeFile from android/app, this script from the
  // repo root: one absolute path means the same file to both.
  if (!path.isAbsolute(props.storeFile!)) {
    return `WC_SIGNING_INVALID: storeFile ${props.storeFile} must be an absolute path. Fix: use the full path of the keystore in android/keystore.properties`;
  }
  if (!keystoreExists) {
    return `WC_SIGNING_MISSING: storeFile ${props.storeFile} does not exist. ${fix}`;
  }
  return null;
}

export interface Folder {
  name: string;
  bytes: number;
}

export const AAB_LIMIT_MB = 150;

/** WC_GATE_AAB_SIZE message, or null when the bundle fits Play's limit. */
export function aabSizeProblem(
  bytes: number,
  folders: Folder[],
): string | null {
  if (bytes <= AAB_LIMIT_MB * 1024 * 1024) return null;
  const top = [...folders]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 5)
    .map((f) => `${f.name} ${(f.bytes / 1048576).toFixed(1)} MB`)
    .join(", ");
  return `WC_GATE_AAB_SIZE: AAB is ${(bytes / 1048576).toFixed(1)} MB, limit ${AAB_LIMIT_MB} MB. Largest folders: ${top}`;
}

export function dirSize(dir: string): number {
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

export function run(
  cmd: string,
  args: string[],
  cwd: string,
  env?: NodeJS.ProcessEnv,
): void {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: isWindows,
    env: env ? { ...process.env, ...env } : process.env,
  });
  if (r.status !== 0) {
    if (cmd.includes("gradlew")) {
      console.error(
        `WC_GRADLE_FAILED: the Android build failed. Fix: scroll up for the Gradle error; ${doc}`,
      );
    }
    process.exit(r.status ?? 1);
  }
}

function javaMajor(): number | null {
  const home = process.env.JAVA_HOME;
  const java = home ? path.join(home, "bin", "java") : "java";
  const r = spawnSync(java, ["-version"], { encoding: "utf-8" });
  const m = /version "(\d+)/.exec(`${r.stderr}${r.stdout}`);
  return r.error || !m ? null : Number(m[1]);
}

function sdkDir(): string | null {
  const env = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT].find(
    Boolean,
  );
  if (env) return env;
  try {
    const props = fs.readFileSync(
      path.join(androidDir, "local.properties"),
      "utf-8",
    );
    return parseProperties(props)["sdk.dir"] || null;
  } catch {
    return null;
  }
}

/** keytool from the same JDK as java (JAVA_HOME), else from PATH. */
export function keytoolPath(): string {
  const home = process.env.JAVA_HOME;
  const name = isWindows ? "keytool.exe" : "keytool";
  return home ? path.join(home, "bin", name) : name;
}

export function gradlew(): string {
  // Explicit .\ : cmd skips the cwd when NoDefaultCurrentDirectoryInExePath is set.
  return isWindows ? ".\\gradlew.bat" : "./gradlew";
}

/** Exits non-zero, printing every problem, unless the tools are in place. */
export function runDoctor(needAdb: boolean): void {
  const errors = doctorProblems(
    {
      javaMajor: javaMajor(),
      sdkDir: sdkDir(),
      gradlewExists: fs.existsSync(path.join(androidDir, "gradlew")),
      adbFound:
        spawnSync("adb", ["version"], { shell: isWindows }).status === 0,
    },
    needAdb,
  );
  if (errors.length > 0) fail(errors.join("\n"));
  console.log("android:doctor OK");
}

/** build.gradle text with versionName and versionCode set for `version`. */
export function setGradleVersion(gradle: string, version: string): string {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`version must be X.Y.Z with no suffix, got ${version}`);
  }
  return gradle
    .replace(/versionName\s+"[^"]*"/, `versionName "${version}"`)
    .replace(/versionCode\s+\d+/, `versionCode ${versionCodeFor(version)}`);
}
