import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { promoteLts } from "./promote-agent-lts.mjs";

function fixture() {
  const version = "1.2.3";
  const files = new Map(
    [
      "acerola-agent-1.2.3-x64.msi",
      "publisher.cer",
      "install-certificate.ps1",
      "configure-machine.ps1",
      "SHA256SUMS",
    ].map((name) => [name, Buffer.from(name)]),
  );
  const artifact = (name) => ({
    key: `agent/releases/${version}/${name}`,
    sizeBytes: files.get(name).length,
    sha256: createHash("sha256").update(files.get(name)).digest("hex"),
  });
  const manifest = {
    version,
    publishedAt: "2026-10-16T12:00:00.000Z",
    artifacts: {
      msi: artifact("acerola-agent-1.2.3-x64.msi"),
      certificate: artifact("publisher.cer"),
    },
  };
  files.set("latest.json", Buffer.from(JSON.stringify(manifest)));
  const objects = new Map(
    [...files].map(([name, body]) => [
      `agent/releases/${version}/${name}`,
      body,
    ]),
  );
  const writes = [];
  return {
    objects,
    writes,
    manifest,
    get: async (key) => objects.get(key) ?? null,
    put: async (key, body) => {
      writes.push(key);
      objects.set(key, body);
    },
  };
}
// feliz
test("promotes only the validated archive and preserves latest and history", async () => {
  const f = fixture();
  const archive = [...f.objects];
  await promoteLts("agent/v1.2.3", f.get, f.put);
  assert.deepEqual(f.writes, ["agent/lts.json"]);
  assert.deepEqual(JSON.parse(f.objects.get("agent/lts.json")), f.manifest);
  for (const [key, value] of archive) assert.equal(f.objects.get(key), value);
  assert.equal(f.objects.has("agent/latest.json"), false);
});
// triste
test("never promotes incomplete or altered artifacts, wrong namespaces or lower versions", async () => {
  for (const mutation of [
    (f) => f.objects.delete("agent/releases/1.2.3/install-certificate.ps1"),
    (f) =>
      f.objects.set(
        "agent/releases/1.2.3/acerola-agent-1.2.3-x64.msi",
        Buffer.from("tampered"),
      ),
    (f) => f.objects.set("agent/lts.json", Buffer.from('{"version":"2.0.0"}')),
  ]) {
    const f = fixture();
    mutation(f);
    await assert.rejects(promoteLts("agent/v1.2.3", f.get, f.put));
    assert.deepEqual(f.writes, []);
  }
  const f = fixture();
  await assert.rejects(promoteLts("dashboard/v1.2.3", f.get, f.put));
  assert.deepEqual(f.writes, []);
});
