import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { normalizeVersion, writeWorkspacePackageVersion } from "./package-version-utils.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requestedVersion = process.argv[2];

if (!requestedVersion) {
  throw new Error("Usage: node ./scripts/bump-package-versions.mjs <version>");
}

const normalizedVersion = normalizeVersion(requestedVersion);
const updatedManifests = writeWorkspacePackageVersion(repositoryRoot, normalizedVersion);

for (const manifest of updatedManifests) {
  console.log(`Updated ${manifest.relativePath} to ${manifest.version}`);
}
