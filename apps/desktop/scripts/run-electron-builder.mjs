import { spawn } from "node:child_process";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDirectory, "..");
const electronBuilderCliPath = resolve(
  packageRoot,
  "node_modules",
  "electron-builder",
  "cli.js"
);

/**
 * Adds the local shim directory to PATH so electron-builder can spawn `pnpm`
 * even on machines where Corepack hasn't installed global shims.
 */
function buildEnvironment() {
  const pathValue = process.env.PATH ?? "";

  return {
    ...process.env,
    PATH: [scriptDirectory, pathValue].filter((value) => value.length > 0).join(delimiter)
  };
}

const child = spawn(process.execPath, [electronBuilderCliPath, ...process.argv.slice(2)], {
  cwd: packageRoot,
  stdio: "inherit",
  env: buildEnvironment()
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

