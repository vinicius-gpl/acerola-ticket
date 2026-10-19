import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const script = join(root, ".github/scripts/release/version.mjs");
const files = [
  "acerola/agent/wails.json",
  "acerola/agent/src-go/lib/version/version.go",
  "acerola/agent/svelte/package.json",
  "acerola/agent/svelte/package-lock.json",
];

test("the bump CLI changes the real project files, preserves dependencies and is idempotent", (context) => {
  const temporary = mkdtempSync(join(tmpdir(), "agent-real-bump-"));
  const read = (file) => readFileSync(join(temporary, file), "utf8");
  const json = (file) => JSON.parse(read(file));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: temporary,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    for (const file of files) {
      mkdirSync(dirname(join(temporary, file)), { recursive: true });
      copyFileSync(join(root, file), join(temporary, file));
    }
    const oldWails = json(files[0]);
    const oldPackage = json(files[2]);
    const oldLock = json(files[3]);
    const [major, minor, patch] = oldWails.info.productVersion
      .split(".")
      .map(Number);
    const version =
      patch < 65535
        ? `${major}.${minor}.${patch + 1}`
        : `${major}.${minor + 1}.0`;
    const tag = `agent/v${version}`;
    git("init");
    git("add", ".");
    // feliz: executa a mesma CLI da Action sobre cópias dos arquivos reais, não fixtures reduzidas.
    execFileSync(process.execPath, [script, "bump", tag], {
      cwd: temporary,
      stdio: "pipe",
    });
    assert.equal(json(files[0]).info.productVersion, version);
    assert.match(
      read(files[1]),
      new RegExp(`const Current = "${version.replaceAll(".", "\\.")}"`),
    );
    assert.equal(json(files[2]).version, version);
    assert.equal(json(files[3]).version, version);
    assert.equal(json(files[3]).packages[""].version, version);
    assert.deepEqual(json(files[2]).dependencies, oldPackage.dependencies);
    assert.deepEqual(
      json(files[2]).devDependencies,
      oldPackage.devDependencies,
    );
    const nextLock = json(files[3]);
    nextLock.version = oldLock.version;
    nextLock.packages[""].version = oldLock.packages[""].version;
    assert.deepEqual(nextLock, oldLock);
    assert.deepEqual(
      git("diff", "--name-only").split("\n").sort(),
      [...files].sort(),
    );
    context.diagnostic(
      `Real files: Wails/Go ${oldWails.info.productVersion} → ${version}; frontend ${oldPackage.version} → ${version}; lockfile root and packages[""] → ${version}`,
    );
    const beforeRetry = files.map(read);
    execFileSync(process.execPath, [script, "bump", tag], {
      cwd: temporary,
      stdio: "pipe",
    });
    assert.deepEqual(files.map(read), beforeRetry);
    // triste: um comando de downgrade precisa falhar sem modificar nenhum arquivo.
    assert.throws(() =>
      execFileSync(process.execPath, [script, "bump", "agent/v0.0.0"], {
        cwd: temporary,
        stdio: "pipe",
      }),
    );
    assert.deepEqual(files.map(read), beforeRetry);
  } finally {
    rmSync(temporary, { recursive: true });
  }
});
