import { spawn } from "node:child_process";
import process from "node:process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const children = [
  spawn(command, ["--filter", "nocodb", "run", "start"], {
    stdio: "inherit",
    env: process.env,
  }),
  spawn(command, ["--filter", "nc-gui", "run", "dev"], {
    stdio: "inherit",
    env: process.env,
  }),
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
