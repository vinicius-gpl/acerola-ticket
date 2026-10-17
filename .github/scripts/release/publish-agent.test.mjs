import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { publish } from "./publish-agent.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "agent-publish-"));
  const artifact = (file) => ({
    key: `agent/releases/1.2.3/${file}`,
    sizeBytes: 7,
    sha256: createHash("sha256").update("fixture").digest("hex"),
  });
  for (const file of [
    "acerola-agent-1.2.3-x64.msi",
    "publisher.cer",
    "configure-machine.ps1",
    "install-certificate.ps1",
    "SHA256SUMS",
  ])
    writeFileSync(join(directory, file), "fixture");
  writeFileSync(
    join(directory, "latest.json"),
    JSON.stringify({
      version: "1.2.3",
      publishedAt: "2026-10-15T12:00:00.000Z",
      artifacts: {
        msi: artifact("acerola-agent-1.2.3-x64.msi"),
        certificate: artifact("publisher.cer"),
      },
    }),
  );
  return directory;
}

test("publishes all artifacts before latest and permits identical retry", async () => {
  // feliz
  const directory = fixture(),
    objects = new Map(),
    order = [];
  const get = async (key) => objects.get(key) ?? null;
  const put = async (key, body) => {
    order.push(key);
    objects.set(key, body);
  };
  try {
    await publish(directory, "1.2.3", get, put);
    assert.equal(order.at(-1), "agent/latest.json");
    assert.equal(objects.size, 7);
    await publish(directory, "1.2.3", get, put);
    // triste: a mesma tag não pode substituir bytes já publicados.
    objects.set(
      "agent/releases/1.2.3/configure-machine.ps1",
      Buffer.from("different"),
    );
    await assert.rejects(publish(directory, "1.2.3", get, put), /immutable/);
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test("never advertises partial uploads, downgrades or altered MSI bytes", async () => {
  // triste
  const directory = fixture();
  let latestWritten = false;
  try {
    await assert.rejects(
      publish(
        directory,
        "1.2.3",
        async () => null,
        async (key) => {
          if (key === "agent/latest.json") latestWritten = true;
          throw new Error("storage unavailable");
        },
      ),
      /storage unavailable/,
    );
    assert.equal(latestWritten, false);
    await assert.rejects(
      publish(
        directory,
        "1.2.3",
        async (key) =>
          key === "agent/latest.json"
            ? Buffer.from('{"version":"2.0.0"}')
            : null,
        async () => {},
      ),
      /newer release/,
    );
    writeFileSync(join(directory, "acerola-agent-1.2.3-x64.msi"), "tampered");
    await assert.rejects(
      publish(
        directory,
        "1.2.3",
        async () => null,
        async () => {},
      ),
      /integrity metadata/,
    );
  } finally {
    rmSync(directory, { recursive: true });
  }
});
