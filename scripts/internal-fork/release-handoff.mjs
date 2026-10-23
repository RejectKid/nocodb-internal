import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

export async function verifiedAssets(directory) {
  const names = (await readdir(directory)).filter((name) =>
    name.endsWith(".zip")
  );
  if (
    names.length !== 1 ||
    !/^nocodb-handoff-[a-z0-9.]+\.zip$/.test(names[0])
  ) {
    throw new Error(
      "Expected exactly one versioned handoff ZIP in the output directory"
    );
  }
  const zip = path.join(directory, names[0]);
  if (!(await stat(zip)).isFile()) throw new Error("ZIP is not a file");
  const checksum = zip + ".sha256";
  const expected = (await readFile(checksum, "utf8")).trim();
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(zip)) hash.update(chunk);
  if (expected !== `${hash.digest("hex")}  ${names[0]}`)
    throw new Error("ZIP checksum mismatch");
  return [zip, checksum];
}

export function releaseConfig(provider, env) {
  const github = provider === "github";
  if (!github && provider !== "gitlab")
    throw new Error("Choose github or gitlab");
  const id = github
    ? `${env.GITHUB_RUN_ID}.${env.GITHUB_RUN_ATTEMPT}`
    : `${env.CI_PIPELINE_ID}.${env.CI_JOB_ID}`;
  if (!/^\d+\.\d+$/.test(id))
    throw new Error("Missing numeric CI run identity");
  const sha = github ? env.GITHUB_SHA : env.CI_COMMIT_SHA;
  if (!/^[a-f0-9]{40}$/.test(sha || ""))
    throw new Error("Missing full source commit");
  const tag = `handoff-${id}`;
  return {
    tag,
    sha,
    name: `Docker handoff ${id}`,
    description: `Docker trial bundle built and smoke-tested from commit ${sha}.\n\nDownload nocodb-handoff-${id}.zip and its .sha256 checksum below (not the source archive). Extract the ZIP.\n\nWindows: load-images.ps1 → setup.ps1 → start.ps1. Linux/macOS: sh load-images.sh → sh setup.sh → sh start.sh.\n\nOpen http://localhost:8080 and register the first administrator. README.md and FEATURE-TESTS.md are included. Existing deployments: follow the upgrade guide and preserve secrets/volumes.\n\nLinux/amd64 images. Internal testing build; not full Business parity or production security certification.`,
  };
}

export async function publish(provider, env = process.env, dependencies = {}) {
  const config = releaseConfig(provider, env);
  const assets = await verifiedAssets(
    env.NC_HANDOFF_OUTPUT || ".handoff-output"
  );
  const expected = `nocodb-${config.tag}.zip`;
  if (path.basename(assets[0]) !== expected)
    throw new Error("Bundle identity does not match this CI run");
  if (provider === "github") {
    if (
      !env.GH_TOKEN ||
      !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || "")
    )
      throw new Error("Missing GitHub credentials/repository");
    const run =
      dependencies.run ||
      ((args) => execFileSync("gh", args, { stdio: "inherit", env }));
    const repo = ["--repo", env.GITHUB_REPOSITORY];
    // Keep partial uploads hidden. Never replace a previous release's assets.
    run([
      "release",
      "create",
      config.tag,
      ...assets,
      ...repo,
      "--target",
      config.sha,
      "--title",
      config.name,
      "--notes",
      config.description,
      "--draft",
    ]);
    run(["release", "edit", config.tag, ...repo, "--draft=false", "--latest"]);
    return config;
  }
  if (!env.CI_JOB_TOKEN || !/^\d+$/.test(env.CI_PROJECT_ID || ""))
    throw new Error("Missing GitLab job credentials/project");
  const api = new URL(env.CI_API_V4_URL);
  if (api.protocol !== "https:")
    throw new Error("GitLab release publishing requires HTTPS");
  const base = `${api.href.replace(/\/$/, "")}/projects/${env.CI_PROJECT_ID}`;
  const request = dependencies.fetch || fetch;
  async function send(url, options) {
    const response = await request(url, {
      ...options,
      redirect: "error",
      headers: { "JOB-TOKEN": env.CI_JOB_TOKEN, ...options.headers },
    });
    // Never print server response bodies: they can contain credentials/settings.
    if (!response.ok)
      throw new Error(`GitLab ${options.method} failed (${response.status})`);
  }
  const links = [];
  for (const file of assets) {
    const name = path.basename(file);
    const url = `${base}/packages/generic/docker-handoff/${config.tag}/${name}`;
    const body = createReadStream(file);
    try {
      await send(url, {
        method: "PUT",
        body,
        duplex: "half",
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String((await stat(file)).size),
        },
      });
    } finally {
      body.destroy();
    }
    links.push({
      name,
      url,
      direct_asset_path: `/${name}`,
      link_type: "package",
    });
  }
  // Only expose a release after both permanent package uploads succeed.
  await send(`${base}/releases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tag_name: config.tag,
      ref: config.sha,
      name: config.name,
      description: config.description,
      assets: { links },
    }),
  });
  return config;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const result = await publish(process.argv[2]);
    console.log(
      `Published ${result.tag}; download the ZIP from this repository's Releases page.`
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
