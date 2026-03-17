import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  assertConsistentPackageVersions,
  readWorkspacePackageVersions
} from "./package-version-utils.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifests = readWorkspacePackageVersions(repositoryRoot);

assertConsistentPackageVersions(manifests);

console.log(`Workspace package versions are consistent at ${manifests[0]?.version ?? "unknown"}.`);
