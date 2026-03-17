import { describe, expect, it } from "vitest";
import {
  getConfiguredAppName,
  getConfiguredAppUserModelId,
  getUserDataOverridePath,
  readRuntimeOverride,
  shouldSkipSingleInstanceLock
} from "./runtime-overrides.js";

function createSources(argv: string[], env: NodeJS.ProcessEnv = {}) {
  return {
    argv,
    env
  };
}

describe("runtime overrides", () => {
  it("prefers explicit command-line values over environment variables", () => {
    const sources = createSources(
      ["app.exe", "--latex-suite-user-data-dir=C:\\temp\\args"],
      {
        LATEX_SUITE_USER_DATA_DIR: "C:\\temp\\env"
      }
    );

    expect(getUserDataOverridePath(sources)).toBe("C:\\temp\\args");
  });

  it("returns defaults for app identity when no overrides exist", () => {
    const sources = createSources(["app.exe"]);

    expect(getConfiguredAppName(sources)).toBe("latex-suite-app");
    expect(getConfiguredAppUserModelId(sources)).toBe("com.latexsuite.app");
  });

  it("treats bare boolean flags as enabled", () => {
    const sources = createSources(["app.exe", "--latex-suite-skip-single-instance-lock"]);

    expect(shouldSkipSingleInstanceLock(sources)).toBe(true);
  });

  it("allows boolean overrides to be disabled explicitly", () => {
    const sources = createSources(["app.exe", "--latex-suite-skip-single-instance-lock=false"], {
      LATEX_SUITE_SKIP_SINGLE_INSTANCE_LOCK: "1"
    });

    expect(shouldSkipSingleInstanceLock(sources)).toBe(false);
  });

  it("normalizes empty override values to null", () => {
    const sources = createSources(["app.exe", "--latex-suite-app-name", "--other-flag"]);

    expect(readRuntimeOverride("latex-suite-app-name", "LATEX_SUITE_APP_NAME", sources)).toBeNull();
    expect(getConfiguredAppName(sources)).toBe("latex-suite-app");
  });
});
