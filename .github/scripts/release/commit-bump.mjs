// Um checkout temporário por tentativa evita rebase, descarte de arquivos e push forçado.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  bumpVersion,
  compareVersions,
  currentVersion,
  parseTag,
  versionFiles,
} from "./version.mjs";

const tag = process.argv[2];
const { component, version } = parseTag(tag);
const root = process.cwd();
function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

for (const branch of ["main", "develop"]) {
  let pushed = false;
  for (let attempt = 0; attempt < 3 && !pushed; attempt++) {
    git(root, "fetch", "origin", branch);
    const temporary = mkdtempSync(join(tmpdir(), "acerola-bump-"));
    const checkout = join(temporary, "checkout");
    git(root, "worktree", "add", "--detach", checkout, `origin/${branch}`);
    try {
      if (compareVersions(currentVersion(checkout, component), version) > 0) {
        console.log(
          `${branch} already has a newer ${component} version; skipping`,
        );
        pushed = true;
        continue;
      }
      bumpVersion(checkout, tag);
      git(checkout, "add", "--", ...versionFiles(component));
      if (!git(checkout, "diff", "--cached", "--name-only")) {
        pushed = true;
        continue;
      }
      const scope = component === "agent" ? "agent" : "web";
      git(
        checkout,
        "commit",
        "-m",
        `[chore](${scope}): Atualiza versão para ${version} [skip ci]`,
      );
      try {
        git(checkout, "push", "origin", `HEAD:refs/heads/${branch}`);
        pushed = true;
      } catch (error) {
        if (attempt === 2) throw error;
        console.log(
          `Concurrent push to ${branch}; retrying with a fresh checkout`,
        );
      }
    } finally {
      git(root, "worktree", "remove", checkout);
      rmSync(temporary, { recursive: true });
    }
  }
}
