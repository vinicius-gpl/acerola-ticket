// As tags são a fonte da versão; nenhum instalador recebe uma versão digitada à parte.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function parseTag(tag) {
  const match =
    /^(agent|dashboard)\/v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(tag);
  if (!match)
    throw new Error(
      "Expected agent/vX.Y.Z or dashboard/vX.Y.Z (no suffix or leading zero)",
    );
  const [, component, major, minor, patch] = match;
  const parts = [major, minor, patch].map(Number);
  if (!parts.every(Number.isSafeInteger))
    throw new Error("Version is too large");
  if (
    component === "agent" &&
    (parts[0] > 255 || parts[1] > 255 || parts[2] > 65535)
  ) {
    throw new Error("MSI requires major/minor <= 255 and patch <= 65535");
  }
  return { component, version: parts.join(".") };
}

export function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return Math.sign(a[index] - b[index]);
  }
  return 0;
}

export function versionFiles(component) {
  if (component === "agent")
    return [
      "acerola/agent/wails.json",
      "acerola/agent/src-go/lib/version/version.go",
      "acerola/agent/svelte/package.json",
      "acerola/agent/svelte/package-lock.json",
    ];
  return [
    "package.json",
    "package-lock.json",
    "shared/package.json",
    "server/package.json",
    "client/package.json",
  ].map((file) => `acerola/dashboard/${file}`);
}

function updateJson(root, file, change) {
  const path = resolve(root, file);
  const original = readFileSync(path, "utf8");
  const data = JSON.parse(original);
  change(data);
  const indent = original.match(/\n(\s+)"/)?.[1] ?? "  ";
  writeFileSync(
    path,
    JSON.stringify(data, null, indent) + (original.endsWith("\n") ? "\n" : ""),
  );
}

export function currentVersion(root, component) {
  const file =
    component === "agent"
      ? "acerola/agent/wails.json"
      : "acerola/dashboard/package.json";
  const data = JSON.parse(readFileSync(resolve(root, file), "utf8"));
  return component === "agent" ? data.info.productVersion : data.version;
}

export function bumpVersion(root, tag) {
  const { component, version } = parseTag(tag);
  if (compareVersions(version, currentVersion(root, component)) < 0)
    throw new Error("Refusing version downgrade");
  const files = versionFiles(component);
  if (component === "agent") {
    updateJson(root, files[0], (data) => {
      data.info.productVersion = version;
    });
    const goPath = resolve(root, files[1]);
    const go = readFileSync(goPath, "utf8");
    if (!/const Current = "[^"]+"/.test(go))
      throw new Error("Agent version constant not found");
    writeFileSync(
      goPath,
      go.replace(/const Current = "[^"]+"/, `const Current = "${version}"`),
    );
    updateJson(root, files[2], (data) => {
      data.version = version;
    });
    updateJson(root, files[3], (data) => {
      data.version = version;
      data.packages[""].version = version;
    });
    return;
  }
  for (const file of files.filter(
    (file) => !file.endsWith("package-lock.json"),
  )) {
    updateJson(root, file, (data) => {
      data.version = version;
    });
  }
  updateJson(root, files[1], (data) => {
    data.version = version;
    for (const key of ["", "shared", "server", "client"])
      data.packages[key].version = version;
  });
}

export function validateTag(root, tag) {
  const parsed = parseTag(tag);
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  git("fetch", "origin", "main");
  const commit = git("rev-parse", `${tag}^{commit}`);
  if (git("rev-parse", "HEAD") !== commit)
    throw new Error("Checkout must match the tagged commit");
  git("merge-base", "--is-ancestor", commit, "origin/main");
  // Reexecutar uma release é permitido; versões mais antigas nunca substituem a última.
  for (const other of git("tag", "--list", `${parsed.component}/v*`)
    .split("\n")
    .filter(Boolean)) {
    let candidate;
    try {
      candidate = parseTag(other);
    } catch {
      continue;
    }
    if (compareVersions(candidate.version, parsed.version) > 0)
      throw new Error(`Newer tag already exists: ${other}`);
  }
  return parsed;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [command, tag] = process.argv.slice(2);
  const root = process.cwd();
  const parsed =
    command === "validate" ? validateTag(root, tag) : parseTag(tag);
  if (command === "bump") bumpVersion(root, tag);
  if (!["validate", "bump"].includes(command))
    throw new Error("Use validate|bump TAG");
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${parsed.version}\ncomponent=${parsed.component}\n`,
    );
  console.log(`${parsed.component} ${parsed.version}`);
}
