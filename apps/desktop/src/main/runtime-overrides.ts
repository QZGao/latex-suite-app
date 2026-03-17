export interface RuntimeOverrideSources {
  argv: string[];
  env: NodeJS.ProcessEnv;
}

function getRuntimeOverrideSources(
  sources?: Partial<RuntimeOverrideSources>
): RuntimeOverrideSources {
  return {
    argv: sources?.argv ?? process.argv,
    env: sources?.env ?? process.env
  };
}

function normalizeRuntimeValue(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function readRuntimeArgValue(
  argName: string,
  sources?: Partial<RuntimeOverrideSources>
): string | null {
  const { argv } = getRuntimeOverrideSources(sources);
  const bareFlag = `--${argName}`;
  const equalsPrefix = `${bareFlag}=`;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith(equalsPrefix)) {
      return normalizeRuntimeValue(arg.slice(equalsPrefix.length));
    }

    if (arg !== bareFlag) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      return null;
    }

    return normalizeRuntimeValue(next);
  }

  return null;
}

function readRuntimeFlagValue(
  argName: string,
  envName: string,
  sources?: Partial<RuntimeOverrideSources>
): boolean {
  const normalizedArg = normalizeRuntimeValue(readRuntimeArgValue(argName, sources));
  if (normalizedArg !== null) {
    return !["0", "false", "no"].includes(normalizedArg.toLowerCase());
  }

  const { argv, env } = getRuntimeOverrideSources(sources);
  if (argv.includes(`--${argName}`)) {
    return true;
  }

  const normalizedEnv = normalizeRuntimeValue(env[envName]);
  if (normalizedEnv === null) {
    return false;
  }

  return !["0", "false", "no"].includes(normalizedEnv.toLowerCase());
}

export function readRuntimeOverride(
  argName: string,
  envName: string,
  sources?: Partial<RuntimeOverrideSources>
): string | null {
  return (
    readRuntimeArgValue(argName, sources) ??
    normalizeRuntimeValue(getRuntimeOverrideSources(sources).env[envName])
  );
}

export function getConfiguredAppName(
  sources?: Partial<RuntimeOverrideSources>
): string {
  return readRuntimeOverride(
    "latex-suite-app-name",
    "LATEX_SUITE_APP_NAME",
    sources
  ) ?? "latex-suite-app";
}

export function getConfiguredAppUserModelId(
  sources?: Partial<RuntimeOverrideSources>
): string {
  return readRuntimeOverride(
    "latex-suite-app-user-model-id",
    "LATEX_SUITE_APP_USER_MODEL_ID",
    sources
  ) ?? "com.latexsuite.app";
}

export function getUserDataOverridePath(
  sources?: Partial<RuntimeOverrideSources>
): string | null {
  return readRuntimeOverride(
    "latex-suite-user-data-dir",
    "LATEX_SUITE_USER_DATA_DIR",
    sources
  );
}

export function shouldSkipSingleInstanceLock(
  sources?: Partial<RuntimeOverrideSources>
): boolean {
  return readRuntimeFlagValue(
    "latex-suite-skip-single-instance-lock",
    "LATEX_SUITE_SKIP_SINGLE_INSTANCE_LOCK",
    sources
  );
}
