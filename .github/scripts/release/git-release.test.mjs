import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { currentVersion, validateTag } from "./version.mjs";

const commitScript = resolve(import.meta.dirname, "commit-bump.mjs");
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "release-git-"));
  const origin = join(directory, "origin.git"),
    checkout = join(directory, "checkout");
  mkdirSync(checkout);
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: checkout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init", "--bare", origin);
  git("init", "-b", "main");
  git("config", "user.name", "Release Test");
  git("config", "user.email", "release@example.test");
  git("config", "commit.gpgsign", "false");
  const write = (path, data) => {
    mkdirSync(dirname(join(checkout, path)), { recursive: true });
    writeFileSync(
      join(checkout, path),
      typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n",
    );
  };
  write("acerola/agent/wails.json", { info: { productVersion: "0.1.0" } });
  write(
    "acerola/agent/src-go/lib/version/version.go",
    'package version\nconst Current = "0.1.0"\n',
  );
  write("acerola/agent/svelte/package.json", { version: "0.1.0" });
  write("acerola/agent/svelte/package-lock.json", {
    version: "0.1.0",
    packages: { "": { version: "0.1.0" } },
  });
  write("unrelated.txt", "keep this content");
  git("add", ".");
  git("commit", "-m", "Initial fixture");
  git("remote", "add", "origin", origin);
  git("push", "-u", "origin", "main");
  git("branch", "develop");
  git("push", "origin", "develop");
  return { directory, checkout, git, write };
}

test("accepts main tag, rejects off-main tag and mismatched checkout", () => {
  const f = fixture();
  try {
    // feliz: a tag aponta para um commit já integrado à main.
    f.git("tag", "agent/v1.2.3");
    assert.equal(validateTag(f.checkout, "agent/v1.2.3").version, "1.2.3");
    // triste: tag de feature não passa como release só porque seu nome está correto.
    f.git("switch", "-c", "feature");
    f.write("feature.txt", "not merged");
    f.git("add", ".");
    f.git("commit", "-m", "Feature");
    f.git("tag", "agent/v1.2.4");
    assert.throws(() => validateTag(f.checkout, "agent/v1.2.4"));
    assert.throws(
      () => validateTag(f.checkout, "agent/v1.2.3"),
      /Checkout must match/,
    );
  } finally {
    rmSync(f.directory, { recursive: true });
  }
});

test("commits only version files to main and develop and is idempotent", () => {
  const f = fixture();
  try {
    // feliz: o commit remoto avança normalmente; a tag original não é movida.
    f.git("tag", "agent/v1.2.3");
    const tagged = f.git("rev-parse", "agent/v1.2.3");
    execFileSync(process.execPath, [commitScript, "agent/v1.2.3"], {
      cwd: f.checkout,
      stdio: "pipe",
    });
    for (const branch of ["main", "develop"]) {
      const data = JSON.parse(
        f.git("show", `origin/${branch}:acerola/agent/wails.json`),
      );
      assert.equal(data.info.productVersion, "1.2.3");
      assert.equal(
        f.git("show", `origin/${branch}:unrelated.txt`),
        "keep this content",
      );
      assert.match(
        f.git("log", "-1", "--format=%s", `origin/${branch}`),
        /^\[chore\]\(agent\):/,
      );
    }
    assert.equal(f.git("rev-parse", "agent/v1.2.3"), tagged);
    const head = f.git("rev-parse", "origin/main");
    execFileSync(process.execPath, [commitScript, "agent/v1.2.3"], {
      cwd: f.checkout,
      stdio: "pipe",
    });
    assert.equal(f.git("rev-parse", "origin/main"), head);
    // triste: retry de versão antiga não rebaixa branches com versão maior.
    execFileSync(process.execPath, [commitScript, "agent/v1.0.0"], {
      cwd: f.checkout,
      stdio: "pipe",
    });
    assert.equal(f.git("rev-parse", "origin/main"), head);
    assert.equal(currentVersion(f.checkout, "agent"), "0.1.0");
  } finally {
    rmSync(f.directory, { recursive: true });
  }
});
