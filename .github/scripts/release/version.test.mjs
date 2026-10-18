import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { bumpVersion, compareVersions, parseTag } from "./version.mjs";

test("accepts only the two exact tag namespaces", () => {
  // feliz
  assert.deepEqual(parseTag("agent/v1.2.3"), {
    component: "agent",
    version: "1.2.3",
  });
  assert.deepEqual(parseTag("dashboard/v12.30.45"), {
    component: "dashboard",
    version: "12.30.45",
  });
  assert.equal(compareVersions("1.10.0", "1.9.9"), 1);
  // triste
  for (const tag of [
    "v1.2.3",
    "agent/prod/v1.2.3",
    "agent/v1.2",
    "agent/v01.2.3",
    "agent/v1.2.3-beta",
    "dashboard/v1.2.3/extra",
    "agent/v256.0.0",
    "agent/v1.256.0",
    "agent/v1.0.65536",
  ]) {
    assert.throws(() => parseTag(tag), undefined, tag);
  }
});

test("updates all owned version files and lock entries without changing dependencies", () => {
  const root = mkdtempSync(join(tmpdir(), "release-version-"));
  const write = (path, data) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(
      join(root, path),
      typeof data === "string" ? data : JSON.stringify(data, null, 2) + "\n",
    );
  };
  const read = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
  try {
    const agent = "acerola/agent/";
    write(agent + "wails.json", { info: { productVersion: "0.1.0" } });
    write(
      agent + "src-go/version/version.go",
      'package version\nconst Current = "0.1.0"\n',
    );
    write(agent + "svelte/package.json", {
      version: "0.1.0",
      dependencies: { fixture: "^3.0.0" },
    });
    write(agent + "svelte/package-lock.json", {
      version: "0.1.0",
      packages: {
        "": { version: "0.1.0" },
        "node_modules/fixture": { version: "3.2.1" },
      },
    });
    const dashboard = "acerola/dashboard/";
    for (const file of [
      "package.json",
      "client/package.json",
      "server/package.json",
      "shared/package.json",
    ])
      write(dashboard + file, { version: "0.1.0" });
    write(dashboard + "package-lock.json", {
      version: "0.1.0",
      packages: Object.fromEntries(
        ["", "client", "server", "shared", "node_modules/fixture"].map(
          (key) => [key, { version: "0.1.0" }],
        ),
      ),
    });
    // feliz: cada release altera somente o componente dono, incluindo seus lockfiles.
    bumpVersion(root, "agent/v1.2.3");
    assert.equal(read(agent + "wails.json").info.productVersion, "1.2.3");
    assert.match(
      readFileSync(join(root, agent + "src-go/version/version.go"), "utf8"),
      /Current = "1.2.3"/,
    );
    assert.equal(
      read(agent + "svelte/package-lock.json").packages[""].version,
      "1.2.3",
    );
    assert.equal(
      read(agent + "svelte/package-lock.json").packages["node_modules/fixture"]
        .version,
      "3.2.1",
    );
    assert.equal(read(dashboard + "package.json").version, "0.1.0");
    bumpVersion(root, "dashboard/v2.0.0");
    for (const key of ["", "client", "server", "shared"])
      assert.equal(
        read(dashboard + "package-lock.json").packages[key].version,
        "2.0.0",
      );
    assert.equal(
      read(dashboard + "package-lock.json").packages["node_modules/fixture"]
        .version,
      "0.1.0",
    );
    assert.equal(read(agent + "wails.json").info.productVersion, "1.2.3");
    // triste: uma tag antiga nunca diminui a versão já publicada.
    assert.throws(() => bumpVersion(root, "agent/v1.0.0"), /downgrade/);
  } finally {
    rmSync(root, { recursive: true });
  }
});
