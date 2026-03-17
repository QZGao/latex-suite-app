const shouldRequireCodeSigning = process.env.LATEX_SUITE_REQUIRE_SIGNING === "true";
const shouldEditExecutables = process.env.LATEX_SUITE_ENABLE_EXECUTABLE_EDITING === "true";

/**
 * Electron Builder config is JavaScript instead of YAML so CI can require full
 * code signing while local packaging stays reproducible without extra machine
 * privileges or certificate material.
 */
export default {
  appId: "com.latexsuite.app",
  productName: "LaTeX Suite",
  executableName: "latex-suite-app",
  asar: true,
  npmRebuild: false,
  forceCodeSigning: shouldRequireCodeSigning,
  directories: {
    output: "../../artifacts/desktop"
  },
  files: ["out/**/*", "package.json"],
  extraResources: [
    {
      from: "../../artifacts/win-bridge/win-x64",
      to: "bridge",
      filter: ["win-bridge.exe"]
    }
  ],
  win: {
    signAndEditExecutable: shouldEditExecutables,
    verifyUpdateCodeSignature: false,
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable",
        arch: ["x64"]
      }
    ]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
};
