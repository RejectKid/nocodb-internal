import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { publish, releaseConfig, verifiedAssets } from "./release-handoff.mjs";

const sha = "a".repeat(40);
async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "handoff-release-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const name = "nocodb-handoff-12.3.zip";
  const content = Buffer.from("test archive fixture, not a runnable image");
  await writeFile(path.join(dir, name), content);
  await writeFile(
    path.join(dir, name + ".sha256"),
    `${createHash("sha256").update(content).digest("hex")}  ${name}\n`
  );
  return dir;
}
function github(dir) {
  return {
    NC_HANDOFF_OUTPUT: dir,
    GITHUB_RUN_ID: "12",
    GITHUB_RUN_ATTEMPT: "3",
    GITHUB_SHA: sha,
    GITHUB_REPOSITORY: "test/private",
    GH_TOKEN: "test-only",
  };
}
function gitlab(dir) {
  return {
    NC_HANDOFF_OUTPUT: dir,
    CI_PIPELINE_ID: "12",
    CI_JOB_ID: "3",
    CI_COMMIT_SHA: sha,
    CI_PROJECT_ID: "42",
    CI_JOB_TOKEN: "test-only",
    CI_API_V4_URL: "https://gitlab.example/api/v4",
  };
}
test("validates checksum and rejects modified archive before publishing", async (t) => {
  const dir = await fixture(t);
  assert.equal((await verifiedAssets(dir)).length, 2);
  await writeFile(path.join(dir, "nocodb-handoff-12.3.zip"), "modified");
  await assert.rejects(
    publish("github", github(dir), {
      run: () => assert.fail("must not publish"),
    }),
    /checksum/
  );
});
test("rejects missing checksum and ambiguous bundles", async (t) => {
  const dir = await fixture(t);
  await writeFile(path.join(dir, "other.zip"), "extra");
  await assert.rejects(verifiedAssets(dir), /exactly one/);
  await rm(path.join(dir, "other.zip"));
  await rm(path.join(dir, "nocodb-handoff-12.3.zip.sha256"));
  await assert.rejects(verifiedAssets(dir), /ENOENT/);
});
test("GitHub uploads a draft first, then publishes latest without clobber", async (t) => {
  const calls = [];
  const dir = await fixture(t);
  await publish("github", github(dir), { run: (args) => calls.push(args) });
  assert.equal(calls.length, 2);
  assert.ok(calls[0].includes("--draft"));
  assert.ok(calls[0].includes(sha));
  assert.ok(calls[1].includes("--draft=false"));
  assert.ok(calls[1].includes("--latest"));
  assert.ok(!calls.flat().includes("--clobber"));
});
test("failed GitHub upload never publishes a partial release", async (t) => {
  const dir = await fixture(t);
  let count = 0;
  await assert.rejects(
    publish("github", github(dir), {
      run: () => {
        count++;
        throw new Error("upload failed");
      },
    }),
    /upload failed/
  );
  assert.equal(count, 1);
});
test("GitLab streams both permanent packages then creates release links", async (t) => {
  const dir = await fixture(t);
  const calls = [];
  await publish("gitlab", gitlab(dir), {
    fetch: async (url, options) => {
      if (options.method === "PUT")
        for await (const _chunk of options.body) {
          /* drain */
        }
      calls.push({ url, ...options });
      return { ok: true };
    },
  });
  assert.deepEqual(
    calls.map((c) => c.method),
    ["PUT", "PUT", "POST"]
  );
  assert.ok(
    calls[0].url.includes("/packages/generic/docker-handoff/handoff-12.3/")
  );
  const release = JSON.parse(calls[2].body);
  assert.equal(release.ref, sha);
  assert.equal(release.assets.links.length, 2);
  assert.equal(
    release.assets.links[0].direct_asset_path,
    "/nocodb-handoff-12.3.zip"
  );
  assert.equal(calls[0].redirect, "error");
});
test("failed GitLab upload never creates a release or exposes response body", async (t) => {
  const dir = await fixture(t);
  const calls = [];
  await assert.rejects(
    publish("gitlab", gitlab(dir), {
      fetch: async (_url, options) => {
        calls.push(options.method);
        return { ok: false, status: 403, text: () => "secret" };
      },
    }),
    /^Error: GitLab PUT failed \(403\)$/
  );
  assert.deepEqual(calls, ["PUT"]);
});
test("rejects mismatched run identity, missing auth, insecure API and invalid source", async (t) => {
  const dir = await fixture(t);
  await assert.rejects(
    publish("github", { ...github(dir), GITHUB_RUN_ID: "99" }),
    /identity/
  );
  await assert.rejects(
    publish("github", { ...github(dir), GH_TOKEN: "" }),
    /credentials/
  );
  await assert.rejects(
    publish("gitlab", {
      ...gitlab(dir),
      CI_API_V4_URL: "http://gitlab.example/api/v4",
    }),
    /HTTPS/
  );
  assert.throws(
    () => releaseConfig("github", { ...github(dir), GITHUB_SHA: "branch" }),
    /commit/
  );
  assert.throws(() => releaseConfig("gitlab", {}), /identity/);
});
