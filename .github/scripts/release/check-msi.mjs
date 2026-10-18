// Valida o artefato compilado: wixl aceita alguns atributos que ainda não implementa.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const [path, version] = process.argv.slice(2);
function table(name) {
  const [header, , , ...rows] = execFileSync(
    "msiinfo",
    ["export", path, name],
    { encoding: "utf8" },
  )
    .trimEnd()
    .split(/\r?\n/)
    .map((line) => line.split("\t"));
  return rows.map((row) =>
    Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""])),
  );
}
const properties = Object.fromEntries(
  table("Property").map((row) => [row.Property, row.Value]),
);
assert.equal(properties.ProductVersion, version);
assert.equal(properties.ProductLanguage, "1046");
assert.equal(properties.ALLUSERS, "1");
assert.equal(properties.ARPPRODUCTICON, "AppIcon.ico");
const summary = execFileSync("msiinfo", ["suminfo", path], {
  encoding: "utf8",
});
assert.match(summary, /Template: x64;1046/);
const buildSearch = table("AppSearch").find(
  (row) => row.Property === "WINDOWS_CURRENT_BUILD",
);
assert.ok(buildSearch);
const buildRegistry = table("RegLocator").find(
  (row) => row.Signature_ === buildSearch.Signature_,
);
assert.equal(buildRegistry?.Root, "2");
assert.equal(
  buildRegistry?.Key,
  "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
);
assert.equal(buildRegistry?.Name, "CurrentBuildNumber");
assert.equal(buildRegistry?.Type, "18");
assert.ok(
  table("LaunchCondition").some(
    (row) =>
      row.Condition ===
      "Installed OR (VersionNT64 AND WINDOWS_CURRENT_BUILD >= 17763)",
  ),
);
const service = table("ServiceInstall").find(
  (row) => row.Name === "AcerolaAgent",
);
assert.ok(service);
assert.equal(service.StartType, "2");
assert.equal(service.StartName, "LocalSystem");
assert.equal(service.ErrorControl, "32769");
const acl = table("MsiLockPermissionsEx").find(
  (row) => row.LockObject === "AGENTDATA",
);
assert.equal(acl?.SDDLText, "O:SYG:SYD:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)");
const sequence = Object.fromEntries(
  table("InstallExecuteSequence").map((row) => [
    row.Action,
    Number(row.Sequence),
  ]),
);
assert.ok(sequence.RemoveExistingProducts > sequence.InstallInitialize);
assert.ok(sequence.RemoveExistingProducts < sequence.InstallFinalize);
assert.ok(sequence.CloseTray < sequence.RemoveFiles);
assert.ok(sequence.InstallServices < sequence.StartServices);
assert.equal(
  table("CustomAction").find((row) => row.Action === "CloseTray")?.Type,
  "3170",
);
assert.equal(table("File").length, 4);
const shortcuts = table("Shortcut");
assert.ok(shortcuts.some((row) => row.Shortcut === "ApplicationStartMenuShortcut"));
assert.ok(shortcuts.some((row) => row.Shortcut === "ApplicationDesktopShortcut"));
console.log(
  "MSI verified: x64, version, service, rollback sequence and protected machine directory",
);
