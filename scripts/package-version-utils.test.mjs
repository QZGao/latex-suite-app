import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  PACKAGE_MANIFEST_PATHS,
  assertConsistentPackageVersions,
  normalizeVersion,
  readWorkspacePackageVersions,
  writeWorkspacePackageVersion
} from "./package-version-utils.mjs";

/**
 * Creates a disposable workspace with minimal package manifests for testing the
 * repo versioning utilities.
 *
 * @param {Record<string, string>} versionsByPath
 * @returns {string}
 */
function createWorkspace(versionsByPath) {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "latex-suite-versioning-"));

  for (const relativePath of PACKAGE_MANIFEST_PATHS) {
    const absolutePath = join(workspaceRoot, relativePath);
    mkdirSync(join(absolutePath, ".."), { recursive: true });
    writeFileSync(
      absolutePath,
      `${JSON.stringify(
        {
          name: relativePath.replace(/[\\/]/g, "-"),
          version: versionsByPath[relativePath]
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  return workspaceRoot;
}

test("normalizeVersion accepts plain semver and strips a leading v", () => {
  assert.equal(normalizeVersion("1.2.3"), "1.2.3");
  assert.equal(normalizeVersion("v2.4.6"), "2.4.6");
});

test("normalizeVersion rejects invalid version input", () => {
  assert.throws(() => normalizeVersion("main"), /Invalid version/);
});

test("assertConsistentPackageVersions accepts matching versions", () => {
  assert.doesNotThrow(() =>
    assertConsistentPackageVersions([
      { relativePath: "package.json", version: "1.0.0" },
      { relativePath: "apps/desktop/package.json", version: "1.0.0" }
    ])
  );
});

test("assertConsistentPackageVersions rejects mismatched versions", () => {
  assert.throws(
    () =>
      assertConsistentPackageVersions([
        { relativePath: "package.json", version: "1.0.0" },
        { relativePath: "apps/desktop/package.json", version: "1.0.1" }
      ]),
    /Workspace package versions are inconsistent/
  );
});

test("writeWorkspacePackageVersion updates every managed manifest", () => {
  const workspaceRoot = createWorkspace({
    "package.json": "0.1.0",
    "apps/desktop/package.json": "0.1.0",
    "packages/contracts/package.json": "0.1.0"
  });

  try {
    writeWorkspacePackageVersion(workspaceRoot, "1.4.0");
    const manifests = readWorkspacePackageVersions(workspaceRoot);

    assert.equal(manifests.every((manifest) => manifest.version === "1.4.0"), true);
    assert.match(
      readFileSync(join(workspaceRoot, "apps/desktop/package.json"), "utf8"),
      /"version": "1\.4\.0"/
    );
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
});
