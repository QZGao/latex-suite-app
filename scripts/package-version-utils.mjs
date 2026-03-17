import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Workspace package manifests that must always share the same version.
 * Vendored dependencies are intentionally excluded.
 */
export const PACKAGE_MANIFEST_PATHS = [
  "package.json",
  "apps/desktop/package.json",
  "packages/contracts/package.json"
];

/**
 * Returns an absolute path inside the repository root.
 *
 * @param {string} repositoryRoot
 * @param {string} relativePath
 * @returns {string}
 */
export function resolveManifestPath(repositoryRoot, relativePath) {
  return resolve(repositoryRoot, relativePath);
}

/**
 * Reads and parses a workspace package manifest.
 *
 * @param {string} repositoryRoot
 * @param {string} relativePath
 * @returns {{ relativePath: string, absolutePath: string, data: Record<string, unknown> }}
 */
export function readPackageManifest(repositoryRoot, relativePath) {
  const absolutePath = resolveManifestPath(repositoryRoot, relativePath);
  const data = JSON.parse(readFileSync(absolutePath, "utf8"));

  return {
    relativePath,
    absolutePath,
    data
  };
}

/**
 * Reads all managed package manifests and returns their current versions.
 *
 * @param {string} repositoryRoot
 * @returns {Array<{ relativePath: string, absolutePath: string, version: string, data: Record<string, unknown> }>}
 */
export function readWorkspacePackageVersions(repositoryRoot) {
  return PACKAGE_MANIFEST_PATHS.map((relativePath) => {
    const manifest = readPackageManifest(repositoryRoot, relativePath);
    const version = typeof manifest.data.version === "string" ? manifest.data.version : "";

    return {
      ...manifest,
      version
    };
  });
}

/**
 * Returns a normalized semver-style version string without a leading `v`.
 *
 * @param {string} version
 * @returns {string}
 */
export function normalizeVersion(version) {
  const trimmedVersion = version.trim().replace(/^v/, "");

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(trimmedVersion)) {
    throw new Error(`Invalid version "${version}". Expected a semver-compatible value.`);
  }

  return trimmedVersion;
}

/**
 * Returns manifests whose version differs from the root package version.
 *
 * @param {Array<{ relativePath: string, version: string }>} manifests
 * @returns {Array<{ relativePath: string, version: string, expectedVersion: string }>}
 */
export function findVersionMismatches(manifests) {
  if (manifests.length === 0) {
    return [];
  }

  const expectedVersion = manifests[0].version;

  return manifests
    .filter((manifest) => manifest.version !== expectedVersion)
    .map((manifest) => ({
      relativePath: manifest.relativePath,
      version: manifest.version,
      expectedVersion
    }));
}

/**
 * Throws when workspace package versions are not identical.
 *
 * @param {Array<{ relativePath: string, version: string }>} manifests
 */
export function assertConsistentPackageVersions(manifests) {
  const mismatches = findVersionMismatches(manifests);

  if (mismatches.length === 0) {
    return;
  }

  const details = mismatches
    .map(
      (mismatch) =>
        `${mismatch.relativePath} has version ${mismatch.version}; expected ${mismatch.expectedVersion}`
    )
    .join("\n");

  throw new Error(`Workspace package versions are inconsistent:\n${details}`);
}

/**
 * Updates all managed package manifests to the requested version.
 *
 * @param {string} repositoryRoot
 * @param {string} version
 * @returns {Array<{ relativePath: string, version: string }>}
 */
export function writeWorkspacePackageVersion(repositoryRoot, version) {
  const normalizedVersion = normalizeVersion(version);

  return PACKAGE_MANIFEST_PATHS.map((relativePath) => {
    const manifest = readPackageManifest(repositoryRoot, relativePath);
    const nextManifest = {
      ...manifest.data,
      version: normalizedVersion
    };

    writeFileSync(manifest.absolutePath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");

    return {
      relativePath,
      version: normalizedVersion
    };
  });
}
