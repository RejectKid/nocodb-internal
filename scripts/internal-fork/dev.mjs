import { spawn } from "node:child_process";
import process from "node:process";

const spawnOptions = {
  stdio: "inherit",
  env: process.env,
};

const spawnPnpm = (args, envOverrides = {}) => {
  const options = {
    ...spawnOptions,
    env: { ...process.env, ...envOverrides },
  };
  if (process.platform === "win32") {
    return spawn(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", ["corepack", "pnpm", ...args].join(" ")],
      options
    );
  }
  return spawn("corepack", ["pnpm", ...args], options);
};

const children = [
  spawnPnpm(["--filter", "nocodb", "run", "start"]),
  spawnPnpm(["--filter", "nc-gui", "run", "dev"]),
];

let stopping = false;
const stop = (signal = "SIGTERM") => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
};

for (const child of children) {
  child.on("exit", (code) => {
    if (!stopping && code) {
      stop();
      process.exitCode = code;
    }
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

console.log("Internal NocoDB fork starting:");
console.log("  UI:      http://localhost:3000");
console.log("  Backend: http://localhost:8080");
console.log("Press Ctrl+C to stop both processes.");
