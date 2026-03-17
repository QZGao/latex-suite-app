import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorDirectory = resolve(repositoryRoot, "vendors", "latex-suite-core");

function runNpm(command) {
  const result = spawnSync(command, {
    cwd: vendorDirectory,
    shell: true,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasVendorToolchain() {
  const executableName = process.platform === "win32" ? "tsc.cmd" : "tsc";
  return existsSync(resolve(vendorDirectory, "node_modules", ".bin", executableName));
}

if (!hasVendorToolchain()) {
  console.log("Installing latex-suite-core dependencies with npm ci...");
  runNpm("npm ci");
}

runNpm("npm run build");
