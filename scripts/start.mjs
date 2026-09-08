import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const runtime = spawnSync(process.execPath, ["scripts/check-runtime.mjs"], { cwd: root, stdio: "inherit" });
if (runtime.status !== 0) process.exit(runtime.status ?? 1);

const build = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, ["dist/server/main.js"], { cwd: root, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
